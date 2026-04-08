let exams = [];

function createParticles() {
    const particlesContainer = document.querySelector('.particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particle.style.width = particle.style.height = (Math.random() * 4 + 2) + 'px';
        particlesContainer.appendChild(particle);
    }
}

function addExam() {
    let subject = document.getElementById('subject').value;
    let date = document.getElementById('date').value;
    let start = document.getElementById('start').value;
    let end = document.getElementById('end').value;
    let room = document.getElementById('room').value;
    let building = document.getElementById('building').value;

    if (!subject || !date || !start || !end || !room || !building) {
        showNotification('Please fill all fields!', 'error');
        return;
    }

    exams.push({subject, date, start, end, room, building});
    renderTable();
    updateExamCount();
    clearInputs();
    showNotification('Exam added successfully! ✅', 'success');
    
    // Animate new row
    setTimeout(() => {
        const rows = document.querySelectorAll('#examTable tr:last-child');
        rows.forEach(row => row.classList.add('fade-in'));
    }, 100);
}

function clearInputs() {
    document.getElementById('subject').value = '';
    document.getElementById('date').value = '';
    document.getElementById('start').value = '';
    document.getElementById('end').value = '';
    document.getElementById('room').value = '';
    document.getElementById('building').value = '';
}

function timesOverlap(t1start, t1end, t2start, t2end) {
    const t1s = parseInt(t1start.replace(':', '')); // "14:30" → 1430
    const t1e = parseInt(t1end.replace(':', ''));
    const t2s = parseInt(t2start.replace(':', ''));
    const t2e = parseInt(t2end.replace(':', ''));
    return t1s < t2e && t1e > t2s;
}

function checkConflict(e1, e2) {
    return e1.date === e2.date &&
           timesOverlap(e1.start, e1.end, e2.start, e2.end);
}

function formatTime12h(time24) {
    let [hours, minutes] = time24.split(':').map(Number);
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 → 12
    minutes = minutes.toString().padStart(2, '0');
    hours = hours.toString().padStart(2, '0');
    return `${hours}:${minutes} ${ampm}`;
}

function renderTable() {
    let table = document.getElementById('examTable');
    table.innerHTML = `
    <tr>
        <th class="left-col">Subject</th>
        <th class="center-col">Date</th>
        <th class="center-col">Time</th>
        <th class="center-col">Room</th>
        <th class="center-col">Building</th>
        <th class="center-col">Status</th>
        <th class="right-col">Remove</th>
    </tr>`;

    exams.forEach((e, i) => {
        let collegeStart = document.getElementById('collegeStart').value;
        let collegeEnd = document.getElementById('collegeEnd').value;
let cs = 0, ce = 2359;
        if (collegeStart && collegeEnd) {
            cs = parseInt(collegeStart.replace(':', ''));
            ce = parseInt(collegeEnd.replace(':', ''));
        }
        const es = parseInt(e.start.replace(':', ''));
        const ee = parseInt(e.end.replace(':', ''));
        const collegeExceed = es < cs || ee > ce;

        // Pre-scan simulation like backend
        let shiftedExams = [];
        let nonShiftedExams = [];
        for (let k = 0; k < exams.length; k++) {
            const ex = exams[k];
            const ex_cs = parseInt(ex.start.replace(':', ''));
            const ex_ce = parseInt(ex.end.replace(':', ''));
            const exCollegeExceed = ex_cs < cs || ex_ce > ce;
            let exOverlap = false;
        for (let m = 0; m < exams.length; m++) {
                if (k !== m && ex.date === exams[m].date && timesOverlap(ex.start, ex.end, exams[m].start, exams[m].end)) {
                    exOverlap = true;
                    break;
                }
            }
            if (exCollegeExceed && exOverlap) {
                const examDate = new Date(ex.date);
                examDate.setDate(examDate.getDate() + 1);
                const shiftedDate = examDate.toISOString().split('T')[0];
                shiftedExams[k] = {exam: ex, shifted_date: shiftedDate};
            } else {
                nonShiftedExams.push(ex);
            }
        }

        const isShifted = !!shiftedExams[i];
        const shiftedInfo = isShifted ? shiftedExams[i] : null;
        let effectiveExam = isShifted ? shiftedInfo.exam : e;
        let examOverlap = false;
        for (let j = 0; j < nonShiftedExams.length; j++) {
            if (nonShiftedExams[j] !== effectiveExam && checkConflict(effectiveExam, nonShiftedExams[j])) {
                examOverlap = true;
                break;
            }
        }

        let row = table.insertRow();
        const conflict = examOverlap || collegeExceed || isShifted;
        row.className = conflict ? 'conflict-row' : 'ok-row';

        const start12 = formatTime12h(effectiveExam.start);
        const end12 = formatTime12h(effectiveExam.end);

        let statusText = '✅ OK';
        if (isShifted) {
            statusText = '🔄 Shift to next day (College Hours)';
        } else if (examOverlap && collegeExceed) {
            statusText = '⚠️ Exam Overlap + College Hours';
        } else if (examOverlap) {
            statusText = '⚠️ Exam Time Overlap';
        } else if (collegeExceed) {
            statusText = '⚠️ College Hours Exceed';
        }

        row.innerHTML = `
            <td class="left-col">${e.subject}</td>
            <td class="center-col">${formatDate(e.date)}</td>
            <td class="center-col">${start12}-${end12}</td>
            <td class="center-col">${e.room}</td>
            <td class="center-col">${e.building}</td>
            <td class="center-col ${(examOverlap || collegeExceed) ? 'conflict' : 'ok'}">${statusText}</td>
            <td class="right-col"><button class="delete-btn" onclick="deleteExam(${i})" title="Delete">🗑️</button></td>
        `;
    });
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function updateExamCount() {
    document.getElementById('examCount').textContent = exams.length;
}

function deleteExam(index) {
    const deletedExam = exams[index].subject;
    exams.splice(index, 1);
    renderTable();
    updateExamCount();
    showNotification(`✅ "${deletedExam}" deleted successfully!`, 'success');
}

let resolvedTimetable = [];

function resolveConflicts() {
    let collegeStart = document.getElementById('collegeStart').value;
    let collegeEnd = document.getElementById('collegeEnd').value;

    if (!collegeStart || !collegeEnd) {
        showNotification('Please enter college timings!', 'error');
        return;
    }

    if (exams.length === 0) {
        showNotification('Add some exams first!', 'warning');
        return;
    }

    // Show loading
    const btn = document.querySelector('.resolve-btn');
    const spinner = document.getElementById('resolveSpinner');
    const text = document.querySelector('.btn-text');
    
    btn.disabled = true;
    spinner.style.display = 'inline-block';
    text.textContent = 'Resolving...';

    console.log('Sending resolve request with exams:', exams, 'college:', collegeStart, collegeEnd);
    fetch('/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exams, collegeStart, collegeEnd })
    })
    .then(res => {
        console.log('Response status:', res.status);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(data => {
        console.log('Response data:', data);
        resolvedTimetable = data;
        if (data.length === 0) {
            document.getElementById('resultSection').style.display = 'none';
            showNotification('No conflicts found!  Your schedule is perfect.', 'success');
            return;
        }
        renderResultTable();
        document.getElementById('resultSection').style.display = 'block';
        showNotification('Conflicts resolved successfully! ', 'success');
    })
    .catch(err => {
        console.error('Resolve error:', err);
        showNotification('Resolve failed - check console for details.', 'error');
    })
    .finally(() => {
        btn.disabled = false;
        spinner.style.display = 'none';
        text.textContent = '✨ Resolve Conflicts';
    });
}

function renderResultTable() {
    let table = document.getElementById('resultTable');
    table.innerHTML = `
    <tr>
        <th class="left-col">Subject</th>
        <th class="center-col">Date</th>
        <th class="center-col">Time</th>
        <th class="center-col">Room</th>
        <th class="center-col">Building</th>
        <th class="right-col">Status</th>
    </tr>`;

    resolvedTimetable.forEach(e => {
        let row = table.insertRow();
        row.classList.add('fade-in');
        
        // Determine status based on shifting
        let statusDisplay = 'OK';
        if (e.was_shifted) {
            statusDisplay = '✅ Shifted to Next Date (College Hours)';
            row.classList.add('shifted-row');
        }
        
        row.innerHTML = `
            <td class="left-col">${e.subject}</td>
            <td class="center-col">${formatDate(e.date)}</td>
            <td class="center-col">${e.time}</td>
            <td class="center-col">${e.room}</td>
            <td class="center-col">${e.building}</td>
            <td class="right-col"><span class="duration">${statusDisplay}</span></td>
        `;
    });
}

function printTimetable() {
    const printWindow = window.open('', '_blank');
    const content = `
        <html>
        <head>
            <title>Exam Timetable</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #f2f2f2; }
                .header { text-align: center; margin-bottom: 30px; color: #333; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Updated Exam Timetable</h1>
            </div>
            <table>${document.getElementById('resultTable').outerHTML}</table>
        </body>
        </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
}

function showNotification(message, type = 'info') {
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after animation
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function handleCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.split('\n').map(l => l.trim()).filter(l => l);
        // Removed header check - process all lines as data
        
        let added = 0, skipped = 0;
        for (let i = 0; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 6) {
                const [subject, date, start, end, room, building] = cols.slice(0,6).map(c => c.trim());
                if (subject && date && room && building && start && end) { // Simplified validation - no regex
                    exams.push({subject, date, start, end, room, building});
                    added++;
                } else {
                    skipped++;
                }
            } else {
                skipped++;
            }
        }
        
        renderTable();
        updateExamCount();
        showNotification(`✅ Added ${added} exams from CSV! ${skipped > 0 ? `Skipped ${skipped} invalid rows.` : ''}`, 'success');
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    updateExamCount();
    document.getElementById('csvFile').addEventListener('change', handleCsvUpload);
});

