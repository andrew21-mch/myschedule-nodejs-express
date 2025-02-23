import React, { useState, useEffect, useRef,useMemo } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSpring, animated } from 'react-spring';
import './App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';

function App() {
  const [schedule, setSchedule] = useState([]);
  const [time, setTime] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const motivationalQuotes = useMemo(() => [
    "Keep pushing forward!",
    "You are capable of amazing things!",
    "Every step is progress!",
    "Success starts with self-belief!",
    "Stay focused and never give up!"
  ], []);
  
  const [currentQuote, setCurrentQuote] = useState(motivationalQuotes[0]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    // Change quote every 10 seconds
    const quoteTimer = setInterval(() => {
      setCurrentQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    }, 10000);

    return () => clearInterval(quoteTimer);
  }, [motivationalQuotes]); // Added motivationalQuotes as a dependency

  // Fetch tasks on mount and update time every second
  useEffect(() => {
    fetchSchedule();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []); // Empty dependency array to run only once on mount

  const fetchSchedule = () => {
    axios.get('http://localhost:5000/schedule')
      .then((response) => setSchedule(response.data))
      .catch((error) => console.log(error));
  };

  // When a task is added, update the schedule
  const addTask = (newTask) => {
    setSchedule([...schedule, newTask]);
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-container">
          <div className="header-title">
            <h1>Task Reminder App</h1>
            <p className="current-time">
              <FontAwesomeIcon icon={faClock} /> Current Time: {time.toLocaleTimeString()}
            </p>
          </div>
          <div className="motivational">
            <FontAwesomeIcon icon={faCheckCircle} />
            <p>{currentQuote}</p>
          </div>
        </div>
      </header>

      <div className="calendar">
        {daysOfWeek.map((day, index) => {
          const dayTasks = schedule.filter(task => task.day === day);
          return (
            <div key={index} className="calendar-day">
              <h3>{day}</h3>
              <div className="task-list">
                {dayTasks.length === 0 ? (
                  <p>No tasks</p>
                ) : (
                  dayTasks.map((entry, taskIndex) => (
                    <TaskCard key={entry._id || taskIndex} entry={entry} currentTime={time} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating + Button */}
      <button className="add-task-button" onClick={() => setShowModal(true)}>+</button>

      {/* Modal for adding a task */}
      {showModal && (
        <AddTaskModal onClose={() => setShowModal(false)} onTaskAdded={addTask} />
      )}

      <ToastContainer />
    </div>
  );
}

const TaskCard = ({ entry, currentTime }) => {
  const now = moment(currentTime);

  // Extract start and end times
  const [startTimeStr, endTimeStr] = entry.time.split(" - ");

  // Ensure proper AM/PM format by explicitly parsing them
  const taskStart = moment(`${entry.day} ${startTimeStr}`, "dddd h:mm A");
  const taskEnd = moment(`${entry.day} ${endTimeStr}`, "dddd h:mm A");
  const reminderTime = moment(`${entry.day} ${entry.reminderTime}`, "dddd h:mm A");

  // Handle cases where times might roll over to the next day (e.g., 11 PM - 1 AM)
  if (taskEnd.isBefore(taskStart)) {
    taskEnd.add(1, 'day'); // Adjust end time to the next day
  }

  // Determine status based on time
  let status = 'normal';
  if (now.isAfter(taskEnd)) {
    status = 'past';  // Task has finished
  } else if (now.isBetween(taskStart, taskEnd, null, '[)')) {
    status = 'ongoing';  // Task is currently happening
  } else if (now.isBetween(reminderTime, taskStart, null, '[)')) {
    status = 'close';  // Task is about to start
  }

  // Show reminders (only twice per task)
  const reminderCount = useRef(0);
  useEffect(() => {
    if (now.isBetween(reminderTime, taskStart) && reminderCount.current < 2) {
      checkReminder(taskStart);
      reminderCount.current += 1;
    }
  }, [currentTime, now, reminderTime, taskStart]); 
  

  const animationStyle = useTaskAnimation(taskStart.toDate(), currentTime);

  return (
    <animated.div style={animationStyle} className={`task-card ${status}`}>
      <div className="task-info">
        <h4>{entry.task}</h4>
        <p>{entry.time}</p>
        <p>Reminds at: {entry.reminderTime}</p>
      </div>
    </animated.div>
  );
};

// Custom hook for task animation using react-spring
const useTaskAnimation = (taskTime, currentTime) => {
  return useSpring({
    opacity: taskTime - currentTime < 60000 ? 1 : 0.5,
    transform: taskTime - currentTime < 60000 ? 'scale(1.1)' : 'scale(1)',
    config: { tension: 200, friction: 10 },
  });
};

// Function to check for reminders and show a popup notification
const checkReminder = (taskTime, reminderTime) => {
  const message = `Reminder: Task at ${new Date(taskTime).toLocaleTimeString()} is coming up!, `;
  toast.info(message);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Task Reminder', { body: message });
  }
};


// Modal component for adding a new task
const AddTaskModal = ({ onClose, onTaskAdded }) => {
  const [day, setDay] = useState('Sunday');
  const [timeInput, setTimeInput] = useState('');
  const [task, setTask] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newTask = { day, time: timeInput, task, reminderTime };

    try {
      const response = await axios.post('http://localhost:5000/schedule', newTask);
      toast.success('Task added successfully!');
      onTaskAdded(response.data);
      onClose();
    } catch (error) {
      toast.error('Failed to add task.');
      console.log("POST error:", error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Add New Task</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Day:
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Time:
            <input type="time" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} required />
          </label>
          <label>
            Task:
            <input type="text" value={task} onChange={(e) => setTask(e.target.value)} required />
          </label>
          <label>
            Reminder Time:
            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} required />
          </label>
          <div className="modal-buttons">
            <button type="submit">Add Task</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
