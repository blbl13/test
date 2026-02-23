// app.js

// Notes Management
let notes = JSON.parse(localStorage.getItem('notes')) || [];

function displayNotes() {
    const notesContainer = document.getElementById('notesContainer');
    notesContainer.innerHTML = '';
    notes.forEach((note, index) => {
        const noteElement = document.createElement('div');
        noteElement.innerHTML = `<h3>${note.title}</h3><p>${note.content}</p><button onclick='editNote(${index})'>Edit</button><button onclick='deleteNote(${index})'>Delete</button>`;
        notesContainer.appendChild(noteElement);
    });
}

function addNote(title, content) {
    notes.push({ title, content });
    localStorage.setItem('notes', JSON.stringify(notes));
    displayNotes();
}

function editNote(index) {
    const newTitle = prompt('Enter new title', notes[index].title);
    const newContent = prompt('Enter new content', notes[index].content);
    notes[index] = { title: newTitle, content: newContent };
    localStorage.setItem('notes', JSON.stringify(notes));
    displayNotes();
}

function deleteNote(index) {
    notes.splice(index, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
    displayNotes();
}

// Anki Cards Management
function createAnkiCard(note) {
    // Logic to create Anki Card (pseudo implementation)
    console.log('Anki Card created for:', note);
}

function autoGenerateAnkiCards() {
    notes.forEach(note => createAnkiCard(note));
}

// Pomodoro Timer
let timer;
let isPaused = false;
function startPomodoro() {
    let timeLeft = 1500; // 25 minutes
    timer = setInterval(() => {
        if (!isPaused) {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(timer);
                alert('Time is up!');
                const sound = new Audio('notification.mp3');
                sound.play();
            }
        }
    }, 1000);
}

function pauseTimer() {
    isPaused = !isPaused;
}

// Markdown Support (for displaying notes)
function parseMarkdown(content) {
    // Basic Markdown parsing logic (pseudo implementation)
    return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// UI Interactions
document.getElementById('addNoteButton').onclick = function() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    addNote(title, content);
};

displayNotes();
