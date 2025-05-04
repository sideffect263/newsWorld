// Favicon animation script
(function () {
  const favicons = ["favicon1.svg", "favicon2.svg", "favicon3.svg", "favicon4.svg", "favicon5.svg", "favicon6.svg"];

  let currentIndex = 0;
  const animationSpeed = 500; // milliseconds between frames

  function updateFavicon() {
    const link = document.querySelector("link[rel*='icon']") || document.createElement("link");
    link.type = "image/svg+xml";
    link.rel = "icon";
    link.href = `/favicon/animatedFavi/${favicons[currentIndex]}`;
    document.getElementsByTagName("head")[0].appendChild(link);

    currentIndex = (currentIndex + 1) % favicons.length;
  }

  // Start the animation
  setInterval(updateFavicon, animationSpeed);
})();
