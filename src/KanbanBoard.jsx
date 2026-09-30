import { useState, useEffect } from 'react';
import './KanbanBoard.css';

const INITIAL_COLUMNS = [
  { id: 'todo', title: 'To Do', color: '#e3f2fd' },
  { id: 'inprogress', title: 'In Progress', color: '#fff3e0' },
  { id: 'done', title: 'Done', color: '#e8f5e9' },
];

const STORAGE_KEY = 'kanban-tasks';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('Failed to load tasks from localStorage:', e);
  }
  return {
    todo: [
      { id: generateId(), title: 'Welcome to your Kanban board!', description: 'Drag cards between columns' },
      { id: generateId(), title: 'Add a new task', description: 'Click the + button in any column' },
    ],
    inprogress: [
      { id: generateId(), title: 'Working on something', description: 'Move me to In Progress' },
    ],
    done: [
      { id: generateId(), title: 'Completed task', description: 'Great job! 🎉' },
    ],
  };
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('Failed to save tasks to localStorage:', e);
  }
}

function TaskCard({ task, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');

  const handleSave = () => {
    onEdit(task.id, { title: editTitle.trim(), description: editDescription.trim() });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="task-card editing">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Task title"
        />
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description (optional)"
          rows={3}
        />
        <div className="task-actions">
          <button onClick={handleSave} className="btn-save">Save</button>
          <button onClick={handleCancel} className="btn-cancel">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <h4>{task.title}</h4>
      {task.description && <p>{task.description}</p>}
      <div className="task-actions">
        <button onClick={() => setIsEditing(true)} className="btn-edit" aria-label="Edit task">✏️</button>
        <button onClick={() => onDelete(task.id)} className="btn-delete" aria-label="Delete task">🗑️</button>
      </div>
    </div>
  );
}

function Column({ column, tasks, onAddTask, onMoveTask, onEditTask, onDeleteTask }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask(column.id, { title: newTitle.trim(), description: newDescription.trim() });
    setNewTitle('');
    setNewDescription('');
    setShowAddForm(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onMoveTask(taskId, column.id);
    }
  };

  return (
    <div className="column" style={{ backgroundColor: column.color }}>
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>
      <div
        className="task-list"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
      {!showAddForm ? (
        <button onClick={() => setShowAddForm(true)} className="btn-add-task">
          + Add Task
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="add-task-form">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
            required
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
          />
          <div className="form-actions">
            <button type="submit" className="btn-save">Add</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-cancel">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState(() => loadTasks());

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const addTask = (columnId, taskData) => {
    setTasks((prev) => ({
      ...prev,
      [columnId]: [...prev[columnId], { id: generateId(), ...taskData }],
    }));
  };

  const moveTask = (taskId, targetColumnId) => {
    setTasks((prev) => {
      const newTasks = { ...prev };
      let taskToMove = null;

      // Find and remove task from current column
      for (const colId of Object.keys(newTasks)) {
        const index = newTasks[colId].findIndex((t) => t.id === taskId);
        if (index !== -1) {
          taskToMove = newTasks[colId][index];
          newTasks[colId] = newTasks[colId].filter((t) => t.id !== taskId);
          break;
        }
      }

      // Add to target column
      if (taskToMove) {
        newTasks[targetColumnId] = [...newTasks[targetColumnId], taskToMove];
      }

      return newTasks;
    });
  };

  const editTask = (taskId, updates) => {
    setTasks((prev) => {
      const newTasks = { ...prev };
      for (const colId of Object.keys(newTasks)) {
        const index = newTasks[colId].findIndex((t) => t.id === taskId);
        if (index !== -1) {
          newTasks[colId] = [
            ...newTasks[colId].slice(0, index),
            { ...newTasks[colId][index], ...updates },
            ...newTasks[colId].slice(index + 1),
          ];
          break;
        }
      }
      return newTasks;
    });
  };

  const deleteTask = (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    setTasks((prev) => {
      const newTasks = { ...prev };
      for (const colId of Object.keys(newTasks)) {
        newTasks[colId] = newTasks[colId].filter((t) => t.id !== taskId);
      }
      return newTasks;
    });
  };

  return (
    <div className="kanban-board">
      <header className="board-header">
        <h1>📋 Kanban Board</h1>
        <p className="subtitle">Drag & drop tasks between columns</p>
      </header>
      <div className="columns">
        {INITIAL_COLUMNS.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasks[column.id] || []}
            onAddTask={addTask}
            onMoveTask={moveTask}
            onEditTask={editTask}
            onDeleteTask={deleteTask}
          />
        ))}
      </div>
    </div>
  );
}