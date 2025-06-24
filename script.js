// Global Selectors for App Elements
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const saveNoteBtn = document.getElementById('save-note-btn');
const updateNoteBtn = document.getElementById('update-note-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const notesContainer = document.getElementById('notes-container');
const noNotesMessage = document.getElementById('no-notes-message');

// Preview Modal Elements
const previewModal = document.getElementById('preview-modal');
const previewTitle = document.getElementById('preview-title');
const previewContent = document.getElementById('preview-content');
const closeModalBtn = document.querySelector('.close-button');

let editingNoteId = null; // To store the ID of the note being edited

// --- Helper Functions ---

// Function to generate a unique ID for notes
function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Function to get notes from Local Storage
function getNotes() {
    const notesJSON = localStorage.getItem('yugnotes');
    try {
        return notesJSON ? JSON.parse(notesJSON) : [];
    } catch (e) {
        console.error("YugNotes: Error parsing notes from Local Storage. Clearing corrupted data.", e);
        localStorage.removeItem('yugnotes');
        return [];
    }
}

// Function to save notes to Local Storage
function saveNotes(notes) {
    localStorage.setItem('yugnotes', JSON.stringify(notes));
}

// Function to display notes
function displayNotes() {
    const notes = getNotes();
    notesContainer.innerHTML = ''; // Clear existing notes

    if (notes.length === 0) {
        noNotesMessage.style.display = 'block';
    } else {
        noNotesMessage.style.display = 'none';
        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.classList.add('note-card');
            noteCard.dataset.id = note.id; // Store unique ID on the card

            const sanitizedTitle = DOMPurify.sanitize(note.title || 'Untitled Note');
            const sanitizedContent = DOMPurify.sanitize(note.content.substring(0, 150));

            noteCard.innerHTML = `
                <div class="note-header">
                    <h3>${sanitizedTitle}</h3>
                    <div class="note-actions">
                        <button class="preview-btn" data-id="${note.id}" aria-label="Preview Note"><i class="fas fa-eye"></i></button>
                        <button class="share-btn" data-id="${note.id}" aria-label="Share Note"><i class="fas fa-share-alt"></i></button>
                        <button class="download-btn" data-id="${note.id}" aria-label="Download Note"><i class="fas fa-download"></i></button>
                        <button class="edit-btn" data-id="${note.id}" aria-label="Edit Note"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" data-id="${note.id}" aria-label="Delete Note"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <p>${sanitizedContent}${note.content.length > 150 ? '...' : ''}</p>
                <small>Last updated: ${new Date(note.timestamp).toLocaleString()}</small>
            `;
            notesContainer.appendChild(noteCard);
        });
    }
}

// --- NEW FALLBACK FUNCTION: Download as Text File ---
function downloadAsTextFile(note) {
    console.log('YugNotes: Falling back to plain text download for note:', note.title);
    const filename = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled_note'}.txt`;
    
    // Combine title and content for text file
    const fileContent = `Title: ${note.title}\n\nContent:\n${note.content}\n\n--- Last Updated: ${new Date(note.timestamp).toLocaleString()} ---`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('YugNotes: Plain text file downloaded successfully.');
}


// Function to download a note (tries PDF, falls back to TXT)
function downloadNote(note) {
    console.log('YugNotes: Attempting to download note:', note.title);

    // FIRST TRY: PDF Download using html2pdf.js
    if (typeof html2pdf !== 'undefined' && html2pdf.default !== undefined) { // Check for html2pdf.js loaded
        console.log('YugNotes: html2pdf.js library detected, attempting PDF download...');

        const filename = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled_note'}.pdf`;

        const contentElement = document.createElement('div');
        contentElement.style.padding = '20mm';
        contentElement.style.fontFamily = 'Arial, sans-serif';
        contentElement.style.color = '#333';
        contentElement.style.wordWrap = 'break-word';

        const sanitizedTitle = DOMPurify.sanitize(note.title || 'Untitled Note');
        const sanitizedContent = DOMPurify.sanitize(note.content).replace(/\n/g, '<br>');

        contentElement.innerHTML = `
            <h1 style="color: #2E7D32; font-size: 28px; margin-bottom: 20px; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                ${sanitizedTitle}
            </h1>
            <p style="font-size: 16px; line-height: 1.8; margin-bottom: 25px; white-space: pre-wrap;">
                ${sanitizedContent}
            </p>
            <div style="font-size: 13px; color: #777; text-align: right; margin-top: 30px; border-top: 1px dashed #eee; padding-top: 10px;">
                Last Updated: ${new Date(note.timestamp).toLocaleString()}
            </div>
            <p style="text-align: center; margin-top: 40px; font-size: 12px; color: #999;">Generated by YugNotes</p>
        `;

        const options = {
            margin: [10, 10, 10, 10],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: false, useCORS: true, allowTaint: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            html2pdf().from(contentElement).set(options).save()
                .then(() => {
                    console.log('YugNotes: PDF downloaded successfully!');
                    displayNotes(); // Re-render notes to ensure event listeners are active
                })
                .catch(error => {
                    console.error('YugNotes: Error during PDF download process:', error);
                    alert('PDF download failed. Attempting plain text download. Check console for details.');
                    downloadAsTextFile(note); // Fallback on PDF failure
                    displayNotes();
                });
        } catch (e) {
            console.error('YugNotes: Critical error starting PDF generation. Attempting plain text download:', e);
            alert('An unexpected error occurred during PDF generation. Attempting plain text download.');
            downloadAsTextFile(note); // Fallback on critical error
            displayNotes();
        }
    } else {
        // FALLBACK: html2pdf.js is NOT loaded or undefined, download as text file
        console.warn('YugNotes: html2pdf.js not found or not fully loaded. Falling back to plain text download.');
        alert('PDF download functionality is not available. Your note will be downloaded as a plain text file (.txt).');
        downloadAsTextFile(note);
    }
}


// Function to share a note (using Web Share API)
function shareNote(note) {
    if (navigator.share) {
        navigator.share({
            title: note.title || 'YugNotes Share',
            text: note.content || 'Check out this note from YugNotes!',
        })
        .then(() => console.log('YugNotes: Note shared successfully'))
        .catch((error) => console.error('YugNotes: Error sharing note:', error));
    } else {
        const shareText = `Title: ${note.title}\nContent: ${note.content}`;
        navigator.clipboard.writeText(shareText)
            .then(() => alert('Web Share API not supported. Note content copied to clipboard!'))
            .catch(err => console.error('YugNotes: Could not copy text to clipboard: ', err));
    }
}

// Function to display note in a preview modal
function previewNote(note) {
    previewTitle.textContent = DOMPurify.sanitize(note.title || 'Untitled Note');
    previewContent.innerHTML = DOMPurify.sanitize(note.content).replace(/\n/g, '<br>');
    previewModal.style.display = 'flex';
}

// --- Event Handlers ---

// Close Preview Modal
closeModalBtn.addEventListener('click', () => {
    previewModal.style.display = 'none';
});

// Close modal if clicked outside
window.addEventListener('click', (event) => {
    if (event.target === previewModal) {
        previewModal.style.display = 'none';
    }
});

// Save/Update Note Handler
saveNoteBtn.addEventListener('click', () => {
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();

    if (!title && !content) {
        alert('Please add a title or content for your note.');
        return;
    }

    const notes = getNotes();
    const timestamp = new Date().toISOString();

    if (editingNoteId) {
        const noteIndex = notes.findIndex(note => note.id === editingNoteId);
        if (noteIndex > -1) {
            notes[noteIndex].title = title;
            notes[noteIndex].content = content;
            notes[noteIndex].timestamp = timestamp;
        }
        editingNoteId = null;
        updateNoteBtn.style.display = 'none';
        cancelEditBtn.style.display = 'none';
        saveNoteBtn.style.display = 'inline-block';
    } else {
        const newNote = {
            id: generateUniqueId(),
            title: title,
            content: content,
            timestamp: timestamp
        };
        notes.push(newNote);
    }

    saveNotes(notes);
    displayNotes();
    noteTitleInput.value = '';
    noteContentInput.value = '';
});

// Delegated Event Listener for Preview, Share, Download, Edit, and Delete buttons
notesContainer.addEventListener('click', (event) => {
    const targetBtn = event.target.closest('button');

    if (!targetBtn) return;

    const id = targetBtn.dataset.id;
    const notes = getNotes();
    const note = notes.find(n => n.id === id);

    if (!note) return;

    if (targetBtn.classList.contains('edit-btn')) {
        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
        editingNoteId = note.id;

        saveNoteBtn.style.display = 'none';
        updateNoteBtn.style.display = 'inline-block';
        cancelEditBtn.style.display = 'inline-block';

        noteTitleInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    else if (targetBtn.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this note?')) {
            let updatedNotes = notes.filter(n => n.id !== id);
            saveNotes(updatedNotes);
            displayNotes();
            if (editingNoteId === id) {
                noteTitleInput.value = '';
                noteContentInput.value = '';
                editingNoteId = null;
                updateNoteBtn.style.display = 'none';
                cancelEditBtn.style.display = 'none';
                saveNoteBtn.style.display = 'inline-block';
            }
        }
    }
    else if (targetBtn.classList.contains('download-btn')) {
        downloadNote(note);
    }
    else if (targetBtn.classList.contains('share-btn')) {
        shareNote(note);
    }
    else if (targetBtn.classList.contains('preview-btn')) {
        previewNote(note);
    }
});

// Cancel Edit Handler
cancelEditBtn.addEventListener('click', () => {
    noteTitleInput.value = '';
    noteContentInput.value = '';
    editingNoteId = null;
    updateNoteBtn.style.display = 'none';
    cancelEditBtn.style.display = 'none';
    saveNoteBtn.style.display = 'inline-block';
});

// --- Initial Load & Existing UI Logic ---

document.addEventListener('DOMContentLoaded', () => {
    displayNotes();

    const fadeElements = document.querySelectorAll('.fade-in');
    const slideElements = document.querySelectorAll('.slide-up');
    const scaleElements = document.querySelectorAll('.scale-in');

    const animateOnLoad = () => {
      fadeElements.forEach(el => el.style.animationDelay = '0.2s');
      slideElements.forEach(el => el.style.animationDelay = '0.4s');
      scaleElements.forEach(el => el.style.animationDelay = '0.6s');

      fadeElements.forEach(el => el.style.animationPlayState = 'running');
      slideElements.forEach(el => el.style.animationPlayState = 'running');
      scaleElements.forEach(el => el.style.animationPlayState = 'running');
    };

    setTimeout(animateOnLoad, 100);

    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
      hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
      });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerOffset = document.querySelector('.main-header').offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.scrollY - headerOffset - 20;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                if (navLinks.classList.contains('active')) {
                  navLinks.classList.remove('active');
                }
            }
        });
    });

    const faqItems = document.querySelectorAll('.faq-item h3');
    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            const parent = item.parentElement;
            parent.classList.toggle('active');
            const answer = parent.querySelector('p');
            if (parent.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
                answer.style.opacity = '1';
            } else {
                answer.style.maxHeight = '0';
                answer.style.opacity = '0';
            }
        });
    });

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    };

    const scrollObserver = new IntersectionObserver(observerCallback, observerOptions);

    document.querySelectorAll('.slide-up, .scale-in, .fade-in').forEach(el => {
      el.style.animationPlayState = 'paused';
      el.style.opacity = '0';
      scrollObserver.observe(el);
    });

    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.animationPlayState = 'running';
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'translateY(0)';
    }
});
