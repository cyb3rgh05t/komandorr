# Notification System – Übersicht

## Kanal

**Telegram** ist der einzige Benachrichtigungskanal. Nachrichten werden über die Telegram Bot API (`sendMessage`) versendet. Es können mehrere Telegram-Ziele (Chats/Topics) konfiguriert werden, und jedes Event kann individuell pro Ziel aktiviert/deaktiviert werden.

---

## Alle Notification-Events (16 Typen)

| #   | Event Type          | Label             | Emoji | Trigger-Quelle  | Trigger-Bedingung                                                                                                           | Frequenz / Intervall                                       |
| --- | ------------------- | ----------------- | ----- | --------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | `service_offline`   | Service Offline   | 🔴    | Monitor Service | Service-HTTP-Status wechselt zu `offline`                                                                                   | Alle **10 Sek.** geprüft, nur bei Statuswechsel            |
| 2   | `service_problem`   | Service Problem   | ⚠️    | Monitor Service | Service-HTTP-Status wechselt zu `problem`                                                                                   | Alle **10 Sek.** geprüft, nur bei Statuswechsel            |
| 3   | `service_recovery`  | Service Recovery  | ✅    | Monitor Service | Service wechselt von `offline`/`problem` zurück zu `online`                                                                 | Alle **10 Sek.** geprüft, nur bei Statuswechsel            |
| 4   | `invite_created`    | Invite Created    | 📨    | Invites API     | Neuer Invite-Code wird generiert                                                                                            | **On-Demand** (API-Aufruf)                                 |
| 5   | `invite_redeemed`   | Invite Redeemed   | 🎉    | Invites API     | User löst einen Invite-Code ein                                                                                             | **On-Demand** (API-Aufruf)                                 |
| 6   | `user_added`        | User Added        | 👤    | Invites API     | Plex-User wird nach Invite-Einlösung hinzugefügt                                                                            | **On-Demand** (API-Aufruf)                                 |
| 7   | `user_removed`      | User Removed      | 🚫    | Invites API     | Plex-User wird manuell oder per Bulk-Aktion entfernt                                                                        | **On-Demand** (API-Aufruf)                                 |
| 8   | `vpn_error`         | VPN Error         | 🔒    | Health Checker  | **Getrennte VPN-Issue-Logik:** stopped/exited/dead/removed/created = One-Shot; unhealthy/not_connected = Error mit Cooldown | Alle **60 Sek.** geprüft (One-Shot oder Cooldown)          |
| 9   | `vpn_recovery`      | VPN Recovery      | 🔒✅  | Health Checker  | VPN-Container erholt sich nach vorherigem Fehler                                                                            | Alle **60 Sek.** geprüft                                   |
| 10  | `nfs_error`         | NFS Error         | 📁    | Health Checker  | NFS-Mount/Export/MergerFS nicht aktiv, Instanz nicht erreichbar, oder einzelne NFS-API-Endpunkte fehlgeschlagen             | Alle **60 Sek.** geprüft, **5 Min. Cooldown**              |
| 11  | `nfs_recovery`      | NFS Recovery      | 📁✅  | Health Checker  | Alle NFS-Mounts/Exports wieder gesund nach vorherigem Fehler                                                                | Alle **60 Sek.** geprüft                                   |
| 12  | `storage_warning`   | Storage Warning   | 💾    | Health Checker  | Speicherpfad ≥ **90%** oder RAID/ZFS in risky state (`degraded`, `failed`, `faulted`, `offline`, `unavail`)                 | Alle **60 Sek.** geprüft, maximal **1x/Tag pro Issue-Key** |
| 13  | `traffic_high`      | Traffic High      | 📡    | Health Checker  | Bandbreite ≥ **95%** für **2+ aufeinanderfolgende Checks** (~2 Min.)                                                        | Alle **60 Sek.** geprüft, **5 Min. Cooldown**              |
| 14  | `traffic_recovery`  | Traffic Recovery  | 📡✅  | Health Checker  | Traffic fällt unter 95% nach vorherigem High-Alert                                                                          | Alle **60 Sek.** geprüft                                   |
| 15  | `uploader_failed`   | Uploader Failed   | 📤    | Health Checker  | Uploader-API meldet fehlgeschlagene Jobs (count > 0)                                                                        | Alle **60 Sek.** geprüft, **5 Min. Cooldown**              |
| 16  | `posterizarr_error` | Posterizarr Error | 🖼    | Health Checker  | Letzte Posterizarr-Laufzeithistorie hat Error-Count > 0                                                                     | Alle **60 Sek.** geprüft, **5 Min. Cooldown**              |

---

## Trigger-Quellen im Detail

### 1. Monitor Service (`backend/app/services/monitor.py`)

- **Intervall:** Alle **10 Sekunden**
- **Gestartet in:** `backend/app/main.py`
- **Logik:** Prüft den HTTP-Status jedes konfigurierten Services. Benachrichtigt nur bei **signifikanten Statuswechseln** (z.B. `online` → `offline`, `offline` → `online`). Kein Cooldown-Timer – rein zustandsbasierte Deduplizierung über `should_notify()`.
- **Events:** `service_offline`, `service_problem`, `service_recovery`

### 2. Health Checker (`backend/app/services/health_checker.py`)

- **Intervall:** Alle **60 Sekunden** (30 Sek. initialer Delay)
- **Gestartet in:** `backend/app/main.py`
- **Events & Bedingungen:**

| Event               | Bedingung                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vpn_error`         | VPN-Issue-Klassen: `stopped` (one-shot), `unhealthy` (cooldown), `not_connected` (cooldown)                                                           |
| `vpn_recovery`      | VPN-Container recovered nach vorherigem Error                                                                                                         |
| `nfs_error`         | NFS-Mount/Export/MergerFS nicht aktiv, Instanz nicht erreichbar, oder einzelne NFS-API-Endpunkte fehlgeschlagen                                       |
| `nfs_recovery`      | Alle NFS-Mounts/Exports gesund nach vorherigem Error                                                                                                  |
| `storage_warning`   | Speicherpfad ≥ 90% oder RAID/ZFS in risky state (`degraded`, `failed`, `faulted`, `offline`, `unavail`); Benachrichtigung maximal 1x/Tag bis Recovery |
| `traffic_high`      | Bandbreite ≥ 95% für 2+ aufeinanderfolgende Checks                                                                                                    |
| `traffic_recovery`  | Traffic unter 95% nach vorherigem High-Alert                                                                                                          |
| `uploader_failed`   | Uploader-API meldet fehlgeschlagene Jobs                                                                                                              |
| `posterizarr_error` | Posterizarr Runtime-History zeigt Errors                                                                                                              |

### 3. Invites API (`backend/app/api/invites.py`)

- **Intervall:** **On-Demand** (wird durch API-Aufrufe ausgelöst)
- **Events & Auslöser:**

| Event             | Auslöser                                 |
| ----------------- | ---------------------------------------- |
| `invite_created`  | Neuer Invite-Code wird via API erstellt  |
| `invite_redeemed` | User löst Invite-Code ein                |
| `user_added`      | Plex-User wird nach Invite hinzugefügt   |
| `user_removed`    | User wird manuell oder per Bulk entfernt |

---

## Cooldown / Deduplizierung

| Mechanismus                     | Gilt für                                                                                                                                 | Default                                   | Konfigurierbar                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| **Cooldown-Timer**              | Health-Checker-Events (`vpn_error` für `unhealthy`/`not_connected`, `nfs_error`, `traffic_high`, `uploader_failed`, `posterizarr_error`) | **5 Minuten**                             | Ja, via `cooldown_minutes` in den Telegram-Einstellungen |
| **One-Shot bis Recovery**       | `vpn_error` bei `stopped/exited/dead/removed/created`                                                                                    | 1 Nachricht pro Ausfallphase              | Nein (zustandsbasiert)                                   |
| **Tages-Reminder bis Recovery** | `storage_warning` (storage path + RAID/ZFS issues)                                                                                       | Maximal 1 Nachricht pro Tag und Issue-Key | Nein (Health-Checker-intern)                             |
| **Zustandsbasiert**             | Service-Events (`service_offline`, `service_problem`, `service_recovery`)                                                                | Nur bei Statuswechsel                     | Nein (fest implementiert)                                |
| **Keine**                       | Invite/User-Events                                                                                                                       | Sofort bei jedem Aufruf                   | Nein                                                     |

Der Cooldown wird pro Ressourcen-Key angewendet, z.B.:

- `vpn_error:container_name`
- `nfs_error:instance`

Zusätzlich verwendet der Health Checker für Storage-Warnings einen Tages-Key pro Problem, z.B.:

- `storage_path:host:/data`
- `storage_raid:host:/dev/md0`
- `storage_zfs:host:tank`

---

## Nachrichtenversand-Flow

```
Trigger (Monitor/HealthChecker/API)
  │
  ▼
notify_*() Methode aufgerufen
  │
  ├─ VPN stopped/exited ⇒ One-Shot bis Recovery
  │
  ├─ Storage Warning ⇒ Tages-Gate (1x/Tag/Issue-Key)
  │
  ▼
Cooldown-Check → falls innerhalb Cooldown → abgebrochen
  │
  ▼
HTML-Nachricht formatiert (mit Emoji, Timestamp, Details)
  │
  ▼
_dispatch(event_type, message)
  │
  ▼
_get_targets_for_event() → löst auf, welche Telegram-Ziele dieses Event empfangen
  │
  ▼
_send_to_target() → Telegram Bot API sendMessage
```

---

## Konfiguration

### Speicherort

`backend/data/config.json` → `notifications.telegram`

### Format (neues Multi-Target-Format)

```json
{
  "notifications": {
    "telegram": {
      "enabled": true,
      "bot_token": "BOT_TOKEN",
      "targets": [
        {
          "id": "default",
          "label": "Default",
          "chat_id": "CHAT_ID",
          "topic_id": null
        }
      ],
      "events": {
        "service_offline": { "enabled": true, "targets": ["default"] },
        "service_problem": { "enabled": true, "targets": ["default"] },
        "service_recovery": { "enabled": true, "targets": ["default"] },
        "invite_created": { "enabled": true, "targets": ["default"] },
        "invite_redeemed": { "enabled": true, "targets": ["default"] },
        "user_added": { "enabled": true, "targets": ["default"] },
        "user_removed": { "enabled": true, "targets": ["default"] },
        "storage_warning": { "enabled": true, "targets": ["default"] },
        "vpn_error": { "enabled": true, "targets": ["default"] },
        "vpn_recovery": { "enabled": true, "targets": ["default"] },
        "nfs_error": { "enabled": true, "targets": ["default"] },
        "nfs_recovery": { "enabled": true, "targets": ["default"] },
        "traffic_high": { "enabled": true, "targets": ["default"] },
        "traffic_recovery": { "enabled": true, "targets": ["default"] },
        "uploader_failed": { "enabled": true, "targets": ["default"] },
        "posterizarr_error": { "enabled": true, "targets": ["default"] }
      },
      "cooldown_minutes": 5
    }
  }
}
```

> **Hinweis:** Das alte Flat-Format (`chat_id`, `notify_offline`, etc.) wird beim Laden automatisch zum neuen Format migriert.

---

## API-Endpunkte

| Methode | Pfad                                 | Beschreibung                                             |
| ------- | ------------------------------------ | -------------------------------------------------------- |
| `GET`   | `/api/notifications/telegram`        | Aktuelle Telegram-Einstellungen abrufen (Token maskiert) |
| `PUT`   | `/api/notifications/telegram`        | Telegram-Einstellungen aktualisieren                     |
| `GET`   | `/api/notifications/telegram/events` | Alle 16 Event-Typen mit Labels auflisten                 |
| `POST`  | `/api/notifications/telegram/test`   | Test-Benachrichtigung senden                             |
| `GET`   | `/api/notifications/status`          | Aktiviert/Konfiguriert-Status abrufen                    |

### Pydantic-Modelle (API)

| Modell                     | Felder                                                                         |
| -------------------------- | ------------------------------------------------------------------------------ |
| `TelegramTarget`           | `id`, `label`, `chat_id`, `topic_id`                                           |
| `EventConfig`              | `enabled`, `targets[]`                                                         |
| `TelegramSettings`         | `enabled`, `bot_token`, `chat_id`, `targets[]`, `events{}`, `cooldown_minutes` |
| `TelegramSettingsResponse` | Response-Wrapper                                                               |
| `TestNotificationResponse` | Test-Ergebnis                                                                  |
| `EventTypesResponse`       | Event-Typen-Liste                                                              |

---

## Beteiligte Dateien

| Schicht      | Datei                                    | Funktion                                               |
| ------------ | ---------------------------------------- | ------------------------------------------------------ |
| **Service**  | `backend/app/services/notifications.py`  | Kern-Service (Senden, Routing, Cooldown, Formatierung) |
| **API**      | `backend/app/api/notifications.py`       | REST-Endpunkte für Einstellungen + Test                |
| **Trigger**  | `backend/app/services/monitor.py`        | Service-Statuswechsel-Benachrichtigungen               |
| **Trigger**  | `backend/app/services/health_checker.py` | VPN/NFS/Storage/Uploader/Traffic/Posterizarr           |
| **Trigger**  | `backend/app/api/invites.py`             | Invite/User-Benachrichtigungen                         |
| **Startup**  | `backend/app/main.py`                    | Startet Health-Checker & Monitor als Hintergrund-Tasks |
| **Config**   | `backend/data/config.json`               | Persistierte Einstellungen                             |
| **Frontend** | `frontend/src/pages/Settings.jsx`        | Telegram-Einstellungen UI                              |
| **i18n**     | `frontend/src/locales/en.json`           | Englische Labels                                       |
| **i18n**     | `frontend/src/locales/de.json`           | Deutsche Labels                                        |
