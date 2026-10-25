const menuBtn = document.getElementById("menu-btn");
const sidebar = document.getElementById("sidebar");

menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
});

const container = document.querySelector(".container");
const handle = document.querySelector(".resize-handle");
const chatPanel = document.querySelector(".chat-panel");

let resizing = false;

handle.addEventListener("mousedown", () => {
    resizing = true;
});

document.addEventListener("mousemove", (e) => {

    if (!resizing) return;

    const chatWidth = window.innerWidth - e.clientX;

    if (chatWidth >= 250 && chatWidth <= 700) {
        container.style.gridTemplateColumns = `1fr 6px ${chatWidth}px`;
    }

});

document.addEventListener("mouseup", () => {
    resizing = false;
});

handle.addEventListener("dblclick", () => {
    container.style.gridTemplateColumns = "1fr 5px 300px";
});