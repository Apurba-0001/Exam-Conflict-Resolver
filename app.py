from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'exam_resolver_secret_2024'

def parse_time(t):
    return datetime.strptime(t, "%H:%M")

def times_overlap(t1start, t1end, t2start, t2end):
    """Check if two time intervals overlap. Times in HH:MM 24h format."""
    t1s = int(t1start.replace(':', ''))
    t1e = int(t1end.replace(':', ''))
    t2s = int(t2start.replace(':', ''))
    t2e = int(t2end.replace(':', ''))
    return t1s < t2e and t1e > t2s

def generate_slots(start, end, duration):
    slots = []
    start_time = parse_time(start)
    end_time = parse_time(end)

    while start_time + timedelta(hours=duration) <= end_time:
        slot_end = start_time + timedelta(hours=duration)
        slots.append(start_time.strftime("%I:%M %p") + "-" + slot_end.strftime("%I:%M %p"))
        start_time += timedelta(hours=duration)

    return slots

@app.route('/')
def home():
    return render_template('index.html')



@app.route('/resolve', methods=['POST'])  # Legacy for table preview
def resolve():
    try:
        data = request.get_json()

        exams = data.get('exams', [])
        college_start = data.get('collegeStart')
        college_end = data.get('collegeEnd')

        if not exams or not college_start or not college_end:
            return jsonify([])

        college_s = parse_time(college_start)
        college_e = parse_time(college_end)

        # Pre-scan for exams with college hour exceed (with or without overlap)
        # These will be shifted to the next date when resolved
        college_exceed_indices = []
        for idx, exam in enumerate(exams):
            start = parse_time(exam['start'])
            end = parse_time(exam['end'])
            college_exceed = start < college_s or end > college_e
            if college_exceed:
                college_exceed_indices.append(idx)

        # Shift college-exceed exams to next day upfront
        for idx in college_exceed_indices:
            exam_date = datetime.strptime(exams[idx]['date'], "%Y-%m-%d") + timedelta(days=1)
            exams[idx]['date'] = exam_date.strftime("%Y-%m-%d")
            exams[idx]['was_shifted'] = True  # Mark as shifted

        result = []
        queue = exams.copy()

        while queue:
            current = queue.pop(0)

            # Skip Sundays - shift to next non-Sunday
            exam_date = datetime.strptime(current['date'], "%Y-%m-%d")
            while exam_date.weekday() == 6:  # Sunday
                exam_date += timedelta(days=1)
            current['date'] = exam_date.strftime("%Y-%m-%d")

            # 🔥 dynamic duration
            start = parse_time(current['start'])
            end = parse_time(current['end'])
            duration = int((end - start).seconds / 3600)

            if duration <= 0:
                duration = 2

            # Check for overlaps with previous results and future queue originals on same date
            original_overlap = False
            
            # Check with already assigned exams originals
            for r in result:
                if r['date'] == current['date'] and times_overlap(current['start'], current['end'], r['original_start'], r['original_end']):
                    original_overlap = True
                    break
            
            # Check with remaining queue originals
            for other in queue:
                if other['date'] == current['date'] and times_overlap(current['start'], current['end'], other['start'], other['end']):
                    original_overlap = True
                    break
            
            if original_overlap:
                # Prefer same-day adjustment for overlaps
                slots = generate_slots(college_start, college_end, duration)
                assigned = None
                
                for slot in slots:
                    slot_conflict = False
                    
                    for r in result:
                        if (
                            r['date'] == current['date'] and
                            r['time'] == slot
                        ):
                            slot_conflict = True
                            break
                    
                    if not slot_conflict:
                        assigned = slot
                        break
                
                if assigned:
                    # Assigned same day slot - add to result
                    result.append({
                        "subject": current['subject'],
                        "date": current['date'],
                        "time": assigned,
                        "original_start": current['start'],
                        "original_end": current['end'],
                        "room": current['room'],
                        "building": current['building'],
                        "was_shifted": current.get('was_shifted', False),
                        "status": f"📅 {current['date']} | ⏰ {assigned} | 📍 {current['room']}-{current['building']} ({duration}h)"
                    })
                else:
                    # No slot, shift day
                    exam_date = datetime.strptime(current['date'], "%Y-%m-%d") + timedelta(days=1)
                    current['date'] = exam_date.strftime("%Y-%m-%d")
                    queue.append(current)
            else:
                # No overlap, normal slot assignment
                slots = generate_slots(college_start, college_end, duration)
                assigned = None

                for slot in slots:
                    conflict = False

                    for r in result:
                        if (
                            r['date'] == current['date'] and
                            r['time'] == slot
                        ):
                            conflict = True
                            break

                    if not conflict:
                        assigned = slot
                        break

                if assigned:
                    result.append({
                        "subject": current['subject'],
                        "date": current['date'],
                        "time": assigned,
                        "original_start": current['start'],
                        "original_end": current['end'],
                        "room": current['room'],
                        "building": current['building'],
                        "was_shifted": current.get('was_shifted', False),
                        "status": f"📅 {current['date']} | ⏰ {assigned} | 📍 {current['room']}-{current['building']} ({duration}h)"
                    })
                else:
                    exam_date = datetime.strptime(current['date'], "%Y-%m-%d") + timedelta(days=1)
                    current['date'] = exam_date.strftime("%Y-%m-%d")
                    queue.append(current)

        # Sort result by date for sequential order
        result.sort(key=lambda x: datetime.strptime(x['date'], "%Y-%m-%d"))

        return jsonify(result)

    except Exception as e:
        print("ERROR:", e)
        return jsonify([])

if __name__ == '__main__':
    app.run(debug=True)