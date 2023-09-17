/* const likeButton = document.getElementById("likeButton");
const likeCountElement = document.getElementById("likeCount");


likeButton.addEventListener("click", async () => {
    const response = await fetch("/likes-content", { method: "POST" });
    const data = await response.json();
    likeCountElement.textContent = data.likeCount;
});

*/