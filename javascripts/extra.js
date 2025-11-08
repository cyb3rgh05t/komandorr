/* Custom JavaScript for Komandorr documentation */

document.addEventListener("DOMContentLoaded", function () {
  // Add copy button functionality enhancement
  const codeBlocks = document.querySelectorAll("pre > code");

  codeBlocks.forEach(function (codeBlock) {
    // Add line numbers for code blocks
    const lines = codeBlock.textContent.split("\n").length;
    if (lines > 5) {
      codeBlock.classList.add("linenums");
    }
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Add external link indicators
  const externalLinks = document.querySelectorAll('a[href^="http"]');
  externalLinks.forEach((link) => {
    if (!link.hostname.includes("cyb3rgh05t.github.io")) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
});
