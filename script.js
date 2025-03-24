// Global variables
let tasks = {
    manual: [],
    ai: []
  };
  
  // Initialize the app
  document.addEventListener('DOMContentLoaded', () => {
    // Load saved tasks from localStorage if available
    loadTasks();
    
    // Set up tab switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs and tab contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to the clicked tab
        tab.classList.add('active');
        
        // Show the corresponding tab content
        const tabContentId = `${tab.dataset.tab}-tab`;
        document.getElementById(tabContentId).classList.add('active');
      });
    });
    
    // Render initial tasks
    renderTasks('manual');
    renderTasks('ai');
  });
  
  // Load tasks from localStorage
  function loadTasks() {
    const savedTasks = localStorage.getItem('smartTaskManager');
    if (savedTasks) {
      tasks = JSON.parse(savedTasks);
    }
  }
  
  // Save tasks to localStorage
  function saveTasks() {
    localStorage.setItem('smartTaskManager', JSON.stringify(tasks));
  }
  
  // Add a manual task
  function addManualTask() {
    const input = document.getElementById('manual-input');
    const taskText = input.value.trim();
    
    if (taskText) {
      const newTask = {
        id: Date.now(),
        text: taskText,
        completed: false,
        subtasks: []
      };
      
      tasks.manual.push(newTask);
      saveTasks();
      renderTasks('manual');
      
      // Clear input
      input.value = '';
    }
  }
  
  // Generate tasks using Groq API
  async function getTasksFromGroq() {
    const prompt = document.getElementById('ai-prompt').value.trim();
    
    if (!prompt) {
      alert('Please enter a prompt to generate tasks');
      return;
    }
    
    // Show loading indicator
    const aiTasksElement = document.getElementById('ai-tasks');
    aiTasksElement.innerHTML = '<div class="loading">Generating tasks with AI...</div>';
    
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions", 
        {
          method: "post",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer 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",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: "You are task creator who generates array of string for task based on user query\nExample - User asks - I want to learn javascript\nresult - { 'tasks': ['Learn basic of variable', 'control flows', 'so on']} in json\n",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 1,
            max_completion_tokens: 1024,
            top_p: 1,
            stream: false,
            response_format: {
              type: "json_object",
            },
            stop: null,
          }),
        }
      );
      
      const body = await response.json();
      console.log(body.choices[0].message.content);
      
      const generatedTasks = JSON.parse(body.choices[0].message.content).tasks;
      
      // Add the generated tasks to our tasks array
      generatedTasks.forEach(taskText => {
        const newTask = {
          id: Date.now() + Math.random(),
          text: taskText,
          completed: false,
          subtasks: []
        };
        tasks.ai.push(newTask);
      });
      
      saveTasks();
      renderTasks('ai');
      
    } catch (error) {
      console.error('Error generating tasks:', error);
      aiTasksElement.innerHTML = '<div class="error">Error generating tasks. Please try again.</div>';
    }
  }
  
  // Render tasks for a specific list (manual or AI)
  function renderTasks(listType) {
    const listElement = document.getElementById(`${listType}-tasks`);
    const tasksList = tasks[listType];
    
    // Clear the list
    listElement.innerHTML = '';
    
    if (tasksList.length === 0) {
      listElement.innerHTML = `<div class="empty-state">No ${listType} tasks yet. ${
        listType === 'manual' ? 'Add a task above.' : 'Generate some tasks using AI.'
      }</div>`;
      return;
    }
    
    // Create task elements
    tasksList.forEach(task => {
      const taskTemplate = document.getElementById('task-template').content.cloneNode(true);
      const taskElement = taskTemplate.querySelector('.task-item');
      
      // Set task ID
      taskElement.dataset.id = task.id;
      taskElement.dataset.type = listType;
      
      // Set task text and checked state
      const taskTextElement = taskElement.querySelector('.task-text');
      taskTextElement.textContent = task.text;
      
      const taskCheckbox = taskElement.querySelector('.task-checkbox');
      taskCheckbox.checked = task.completed;
      
      if (task.completed) {
        taskElement.classList.add('task-completed');
      }
      
      // Render subtasks
      const subtasksContainer = taskElement.querySelector('.subtasks');
      renderSubtasks(subtasksContainer, task);
      
      // Add event listeners
      setupTaskEventListeners(taskElement, task, listType);
      
      // Add to DOM
      listElement.appendChild(taskElement);
    });
  }
  
  // Render subtasks for a task
  function renderSubtasks(container, task) {
    container.innerHTML = '';
    
    if (task.subtasks.length === 0) {
      return;
    }
    
    task.subtasks.forEach(subtask => {
      const subtaskElement = document.createElement('div');
      subtaskElement.className = 'subtask-item';
      subtaskElement.dataset.id = subtask.id;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'subtask-checkbox';
      checkbox.checked = subtask.completed;
      checkbox.addEventListener('change', () => toggleSubtaskCompletion(task, subtask));
      
      const textSpan = document.createElement('span');
      textSpan.className = 'subtask-text';
      textSpan.textContent = subtask.text;
      if (subtask.completed) {
        textSpan.style.textDecoration = 'line-through';
        textSpan.style.color = '#999';
      }
      
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'subtask-actions';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => editSubtask(subtaskElement, task, subtask));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteSubtask(task, subtask));
      
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);
      
      subtaskElement.appendChild(checkbox);
      subtaskElement.appendChild(textSpan);
      subtaskElement.appendChild(actionsDiv);
      
      container.appendChild(subtaskElement);
    });
  }
  
  // Set up event listeners for a task
  function setupTaskEventListeners(taskElement, task, listType) {
    // Toggle task completion
    const checkbox = taskElement.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => {
      toggleTaskCompletion(task, listType);
      
      if (checkbox.checked) {
        taskElement.classList.add('task-completed');
      } else {
        taskElement.classList.remove('task-completed');
      }
    });
    
    // Edit task
    const editBtn = taskElement.querySelector('.btn-edit');
    editBtn.addEventListener('click', () => {
      editTask(taskElement, task, listType);
    });
    
    // Add subtask
    const addSubtaskBtn = taskElement.querySelector('.btn-add-subtask');
    addSubtaskBtn.addEventListener('click', () => {
      addSubtask(taskElement, task, listType);
    });
    
    // Delete task
    const deleteBtn = taskElement.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => {
      deleteTask(task, listType);
    });
  }
  
  // Toggle task completion status
  function toggleTaskCompletion(task, listType) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks(listType);
  }
  
  // Toggle subtask completion status
  function toggleSubtaskCompletion(task, subtask) {
    subtask.completed = !subtask.completed;
    saveTasks();
    
    // Re-render the parent task to update subtasks
    const taskElement = document.querySelector(`.task-item[data-id="${task.id}"]`);
    if (taskElement) {
      const subtasksContainer = taskElement.querySelector('.subtasks');
      renderSubtasks(subtasksContainer, task);
    }
  }
  
  // Edit task
  function editTask(taskElement, task, listType) {
    const taskHeaderElement = taskElement.querySelector('.task-header');
    const taskTextElement = taskElement.querySelector('.task-text');
    const originalText = task.text;
    
    // Create edit form
    const editForm = document.createElement('div');
    editForm.className = 'task-edit-form';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = originalText;
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const newText = input.value.trim();
      if (newText) {
        task.text = newText;
        saveTasks();
      }
      
      // Restore the task view
      editForm.remove();
      taskTextElement.style.display = '';
      taskElement.querySelector('.task-actions').style.display = '';
      
      renderTasks(listType);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.backgroundColor = '#999';
    cancelBtn.addEventListener('click', () => {
      // Restore the task view
      editForm.remove();
      taskTextElement.style.display = '';
      taskElement.querySelector('.task-actions').style.display = '';
    });
    
    editForm.appendChild(input);
    editForm.appendChild(saveBtn);
    editForm.appendChild(cancelBtn);
    
    // Hide task text and actions
    taskTextElement.style.display = 'none';
    taskElement.querySelector('.task-actions').style.display = 'none';
    
    // Insert edit form
    taskHeaderElement.insertBefore(editForm, taskElement.querySelector('.task-actions'));
    
    // Focus the input
    input.focus();
  }
  
  // Add subtask to a task
  function addSubtask(taskElement, task, listType) {
    // Check if there's already a subtask form
    if (taskElement.querySelector('.subtask-form')) {
      return;
    }
    
    // Create subtask form
    const subtaskForm = document.createElement('div');
    subtaskForm.className = 'subtask-form';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'subtask-edit-input';
    input.placeholder = 'Enter subtask...';
    
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => {
      const subtaskText = input.value.trim();
      if (subtaskText) {
        const newSubtask = {
          id: Date.now(),
          text: subtaskText,
          completed: false
        };
        
        task.subtasks.push(newSubtask);
        saveTasks();
        
        const subtasksContainer = taskElement.querySelector('.subtasks');
        renderSubtasks(subtasksContainer, task);
      }
      
      // Remove the form
      subtaskForm.remove();
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.backgroundColor = '#999';
    cancelBtn.addEventListener('click', () => {
      subtaskForm.remove();
    });
    
    subtaskForm.appendChild(input);
    subtaskForm.appendChild(addBtn);
    subtaskForm.appendChild(cancelBtn);
    
    // Add to DOM
    const subtasksContainer = taskElement.querySelector('.subtasks');
    subtasksContainer.appendChild(subtaskForm);
    
    // Focus the input
    input.focus();
  }
  
  // Edit subtask
  function editSubtask(subtaskElement, task, subtask) {
    const subtaskTextElement = subtaskElement.querySelector('.subtask-text');
    const originalText = subtask.text;
    
    // Create edit form
    const editForm = document.createElement('div');
    editForm.className = 'subtask-edit-form';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'subtask-edit-input';
    input.value = originalText;
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const newText = input.value.trim();
      if (newText) {
        subtask.text = newText;
        saveTasks();
      }
      
      // Re-render subtasks
      const taskElement = document.querySelector(`.task-item[data-id="${task.id}"]`);
      if (taskElement) {
        const subtasksContainer = taskElement.querySelector('.subtasks');
        renderSubtasks(subtasksContainer, task);
      }
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.backgroundColor = '#999';
    cancelBtn.addEventListener('click', () => {
      // Re-render subtasks (restores original view)
      const taskElement = document.querySelector(`.task-item[data-id="${task.id}"]`);
      if (taskElement) {
        const subtasksContainer = taskElement.querySelector('.subtasks');
        renderSubtasks(subtasksContainer, task);
      }
    });
    
    editForm.appendChild(input);
    editForm.appendChild(saveBtn);
    editForm.appendChild(cancelBtn);
    
    // Replace subtask content with edit form
    subtaskElement.innerHTML = '';
    subtaskElement.appendChild(editForm);
    
    // Focus the input
    input.focus();
  }
  
  // Delete subtask
  function deleteSubtask(task, subtask) {
    if (confirm('Are you sure you want to delete this subtask?')) {
      task.subtasks = task.subtasks.filter(st => st.id !== subtask.id);
      saveTasks();
      
      // Re-render subtasks
      const taskElement = document.querySelector(`.task-item[data-id="${task.id}"]`);
      if (taskElement) {
        const subtasksContainer = taskElement.querySelector('.subtasks');
        renderSubtasks(subtasksContainer, task);
      }
    }
  }
  
  // Delete task
  function deleteTask(task, listType) {
    if (confirm('Are you sure you want to delete this task and all its subtasks?')) {
      tasks[listType] = tasks[listType].filter(t => t.id !== task.id);
      saveTasks();
      renderTasks(listType);
    }
  }