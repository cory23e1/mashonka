document.addEventListener('DOMContentLoaded', function () {
  // Глобальные переменные
    const SESSION_KEY = 'userSession';
    
    let currentUser = null;          // { type: 'teacher' } или { type: 'student', data: {...} }
    let selectedStudentId = null;    // для преподавателя
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let allStudents = [];            // кэш списка учеников

    //Биндинг функций к кнопкам

    // ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
    function showLoginError(msg) {
      document.getElementById('login-error').textContent = msg;
    }

    function formatDate(date) {
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${d}.${m}.${y}`;
    }

    function parseDate(str) {
      const parts = str.split('.');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }

    function showToast(message) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    }

    // ==================== ЗАГРУЗКА ДАННЫХ ИЗ БД ====================
    async function fetchStudents() {
      const snapshot = await database.ref('students').once('value');
      const students = [];
      snapshot.forEach(child => {
        students.push({ id: child.key, ...child.val() });
      });
      allStudents = students;
      return students;
    }

    async function fetchLessonsForStudent(studentId) {
      const snapshot = await database.ref('lessons').once('value');
      const lessons = [];
      snapshot.forEach(child => {
        const lesson = child.val();
        if (lesson.studentId === studentId) {
          lessons.push({ id: child.key, ...lesson });
        }
      });
      console.log(`Найдено уроков для ${studentId}:`, lessons.length, lessons); // для отладки
      return lessons;
    }

    async function fetchLessonsForDate(dateStr) {
      const snapshot = await database.ref('lessons').once('value');
      const lessons = [];
      snapshot.forEach(child => {
        const lesson = child.val();
        if (lesson.date === dateStr) {
          lessons.push({ id: child.key, ...lesson });
        }
      });
      return lessons;
    }

    async function fetchAllLessons() {
      const snapshot = await database.ref('lessons').once('value');
      console.log('Сырые данные из lessons:', snapshot.val());  // ← посмотрите, что реально лежит в базе
      const lessons = [];
      snapshot.forEach(child => {
        console.log('Ребёнок:', child.key, child.val());
        lessons.push({ id: child.key, ...child.val() });
      });
      console.log('Всего уроков после обработки:', lessons.length);
      return lessons;
    }

    // Загрузка файла домашнего задания в Firebase Storage
    // async function uploadHomeworkFile(file) {
    //   const storageRef = storage.ref(`homework/${Date.now()}_${file.name}`);
    //   await storageRef.put(file);
    //   return await storageRef.getDownloadURL();
    // }

    // ==================== АУТЕНТИФИКАЦИЯ ====================
    document.getElementById('login-btn').addEventListener('click', async () => {
      const login = document.getElementById('login-input').value.trim();
      const password = document.getElementById('password-input').value.trim();
      showLoginError('');
    
      if (login === 'admin' && password === 'admin') {
        currentUser = { type: 'teacher' };
        saveSession({ type: 'teacher' });
        enterTeacherMode();
        return;
      }
    
      const students = await fetchStudents();
      const student = students.find(s => s.login === login && s.password === password);
      if (student) {
        currentUser = { type: 'student', data: student };
        saveSession({ type: 'student', studentId: student.id });
        enterStudentMode(student);
      } else {
        showLoginError('Неверный логин или пароль');
      }
    });

  document.getElementById('register-btn').addEventListener('click', async () => {
    const fullName = document.getElementById('reg-fullname').value.trim();
    const login = document.getElementById('reg-login').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const avatarFile = document.getElementById('reg-avatar').files[0];
    let avatarUrl = ''; // или заглушка
    if (avatarFile) {
      avatarUrl = await readFileAsDataURL(avatarFile);
    }
    
    showRegisterError('');
  
    if (!fullName || !login || !password) {
      showRegisterError('Заполните все поля');
      return;
    }
  
    const students = await fetchStudents();
    if (students.some(s => s.login === login)) {
      showRegisterError('Логин уже занят');
      return;
    }
    if (login === 'admin') {
      showRegisterError('Логин зарезервирован');
      return;
    }
  
    const newStudentRef = database.ref('students').push();
    const newStudent = {
      fullName,
      login,
      password,
      avatarUrl: avatarUrl || '' // сохраняем data URL
    };
    await newStudentRef.set(newStudent);
  
    const studentData = { id: newStudentRef.key, ...newStudent };
    currentUser = { type: 'student', data: studentData };
    saveSession({ type: 'student', studentId: studentData.id });
    enterStudentMode(studentData);
  });

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function showRegisterError(msg) {
    document.getElementById('register-error').textContent = msg;
  }

  document.getElementById('show-register').addEventListener('click', () => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('register-screen').classList.remove('hidden');
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
  });
  
  document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('register-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
  });

  function logout() {
    clearSession();
    currentUser = null;
    document.getElementById('teacher-panel').classList.add('hidden');
    document.getElementById('student-panel').classList.add('hidden');
    document.getElementById('register-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-input').value = '';
    document.getElementById('password-input').value = '';
    showLoginError('');
  }
  
  document.getElementById('teacher-logout').addEventListener('click', logout);
  document.getElementById('student-logout').addEventListener('click', logout);

    function enterTeacherMode() {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('register-screen').classList.add('hidden');
      document.getElementById('teacher-panel').classList.remove('hidden');
      document.getElementById('student-panel').classList.add('hidden');
      renderTeacherInterface();
      renderMaterials('materials-list');
    }

    function enterStudentMode(student) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('register-screen').classList.add('hidden');
      document.getElementById('teacher-panel').classList.add('hidden');
      document.getElementById('student-panel').classList.remove('hidden');
      document.getElementById('student-name').textContent = student.fullName;
      document.getElementById('student-avatar').src = student.avatarUrl || 'https://via.placeholder.com/60';
      renderStudentLessons(student.id);
      renderMaterials('materials-list-student');
    }

    // ==================== ИНТЕРФЕЙС ПРЕПОДАВАТЕЛЯ ====================
    async function renderTeacherInterface() {
      await renderStudentsList();
      renderCalendar(currentYear, currentMonth);
      renderTodayActivity();
      checkTodayNotifications();
    }

    async function renderStudentsList() {
      const container = document.getElementById('students-list');
      container.innerHTML = '';
      const students = await fetchStudents();
      students.forEach(student => {
        const div = document.createElement('div');
        div.className = 'student-card';
        div.innerHTML = `
          <img src="${student.avatarUrl || 'https://via.placeholder.com/40'}" alt="avatar">
          <span>${student.fullName}</span>
        `;
        div.addEventListener('click', () => onStudentClick(student));
        container.appendChild(div);
      });
    }

    async function onStudentClick(student) {
      selectedStudentId = student.id;
      const datesDiv = document.getElementById('student-dates');
      datesDiv.classList.remove('hidden');
      datesDiv.innerHTML = `<h4>${student.fullName}</h4>`;
      
      const lessons = await fetchLessonsForStudent(student.id);
      console.log('Загружено уроков:', lessons.length, lessons);
      const dates = [...new Set(lessons.map(l => l.date))].sort((a,b) => parseDate(a) - parseDate(b));
      
      dates.forEach(date => {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date-item';
        dateDiv.textContent = date;
        dateDiv.addEventListener('click', () => showLessonForm(student.id, date, lessons.find(l => l.date === date)));
        datesDiv.appendChild(dateDiv);
      });

      // Кнопка добавления новой даты
      const addBtn = document.createElement('button');
      addBtn.textContent = '+ Добавить дату';
      addBtn.style.cssText = 'margin-top:10px; padding:8px; background:#3498db; color:white; border:none; border-radius:5px; cursor:pointer;';
      addBtn.addEventListener('click', () => {
        const newDate = prompt('Введите дату в формате ДД.ММ.ГГГГ:');
        if (newDate && /^\d{2}\.\d{2}\.\d{4}$/.test(newDate)) {
          showLessonForm(student.id, newDate, null);
        } else if (newDate) {
          alert('Неверный формат даты');
        }
      });
      datesDiv.appendChild(addBtn);
    }

    function showLessonForm(studentId, date, existingLesson) {
      const datesDiv = document.getElementById('student-dates');
      // Удаляем предыдущую форму, если есть
      const oldForm = datesDiv.querySelector('.lesson-form');
      if (oldForm) oldForm.remove();

      const form = document.createElement('div');
      form.className = 'lesson-form';
      form.innerHTML = `
        <h4>${date}</h4>
        <h4>Время встречи:</h4>
        <input type="time" id="lesson-time" value="${existingLesson?.time || ''}" placeholder="Время (ЧЧ:ММ)">
        <h4>Zoom</h4>
        <input type="text" id="lesson-zoom" value="${existingLesson?.zoomLink || ''}" placeholder="Ссылка на Zoom">
        <h4>Идентификатор конференции</h4>
        <input type="text" id="lesson-zoom-id" value="${existingLesson?.zoomId || ''}" placeholder="Идентификатор конференции">
        <h4>Пароль конференции</h4>
        <input type="text" id="lesson-zoom-password" value="${existingLesson?.zoomPassword || ''}" placeholder="Пароль конференции">
        <h4>Домашнее задание</h4>
        <input type="file" id="lesson-file">
        <h4>Комментарий к домашнему заданию</h4>
        <textarea id="lesson-comment" placeholder="Комментарий к домашнему заданию">${existingLesson?.homework?.comment || ''}</textarea>
        <button id="save-lesson">Сохранить</button>
        ${existingLesson ? `<button id="delete-lesson" style="background:#e74c3c;">Удалить урок</button>` : ''}
      `;
      datesDiv.appendChild(form);

      document.getElementById('save-lesson').addEventListener('click', async () => {
        const time = document.getElementById('lesson-time').value;
        const zoomLink = document.getElementById('lesson-zoom').value;
        const fileInput = document.getElementById('lesson-file');
        const comment = document.getElementById('lesson-comment').value;

      let homeworkData = existingLesson?.homework || {};
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileData = await readFileAsDataURL(file);
        homeworkData = { fileName: file.name, fileUrl: fileData, comment }; // fileUrl теперь data URL
      } else if (comment !== (existingLesson?.homework?.comment || '')) {
        homeworkData = { ...homeworkData, comment };
      }

        const zoomId = document.getElementById('lesson-zoom-id').value;
        const zoomPassword = document.getElementById('lesson-zoom-password').value;
        
        const lessonData = {
          studentId,
          date,
          time,
          zoomLink,
          zoomId,
          zoomPassword,
          homework: homeworkData
        };

        if (existingLesson) {
          await database.ref(`lessons/${existingLesson.id}`).update(lessonData);
        } else {
          await database.ref('lessons').push(lessonData);
        }
        alert('Урок сохранён');
        onStudentClick(allStudents.find(s => s.id === studentId));
        renderCalendar(currentYear, currentMonth);
        renderTodayActivity();
      });

      if (existingLesson) {
        document.getElementById('delete-lesson').addEventListener('click', async () => {
          if (confirm('Удалить этот урок?')) {
            await database.ref(`lessons/${existingLesson.id}`).remove();
            alert('Урок удалён');
            onStudentClick(allStudents.find(s => s.id === studentId));
            renderCalendar(currentYear, currentMonth);
            renderTodayActivity();
          }
        });
      }
    }

    // ==================== КАЛЕНДАРЬ ====================
    function renderCalendar(year, month) {
      const container = document.getElementById('calendar');
      container.innerHTML = '';
      document.getElementById('calendar-title').textContent = new Date(year, month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

      const firstDay = new Date(year, month, 1).getDay(); // 0 - вс, 1 - пн ...
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      // Пустые ячейки предыдущего месяца
      for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'day other-month';
        day.textContent = daysInPrevMonth - i;
        container.appendChild(day);
      }

      const todayStr = formatDate(new Date());

      // Дни текущего месяца
      for (let d = 1; d <= daysInMonth; d++) {
        const day = document.createElement('div');
        day.className = 'day';
        day.textContent = d;
        const dateStr = `${d.toString().padStart(2,'0')}.${(month+1).toString().padStart(2,'0')}.${year}`;
        day.dataset.date = dateStr;
        if (dateStr === todayStr) day.classList.add('today');
        container.appendChild(day);
      }

      // Заполняем оставшиеся ячейки следующего месяца
      const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
      for (let i = firstDay + daysInMonth; i < totalCells; i++) {
        const day = document.createElement('div');
        day.className = 'day other-month';
        day.textContent = i - firstDay - daysInMonth + 1;
        container.appendChild(day);
      }

      // Отмечаем дни, где есть уроки
      fetchAllLessons().then(lessons => {
        const datesWithLessons = new Set(lessons.map(l => l.date));
        console.log('Даты с уроками:', datesWithLessons); // для отладки
        
        document.querySelectorAll('.day:not(.other-month)').forEach(day => {
          const normalizedDayDate = normalizeDate(day.dataset.date);
          if (datesWithLessons.has(normalizedDayDate)) {
            day.classList.add('has-lessons');
          }
          day.addEventListener('click', () => {
            // Убираем выделение со всех дней
            document.querySelectorAll('.calendar .day').forEach(d => d.classList.remove('selected'));
            // Выделяем текущий день
            day.classList.add('selected');
            // Показываем информацию о занятиях
            showLessonsForDate(day.dataset.date);
          });
        });
      });
    }

  function normalizeDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('.');
    if (parts.length !== 3) return dateStr;
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    return `${day}.${month}.${year}`;
  }

    async function showLessonsForDate(dateStr) {
      const lessons = await fetchLessonsForDate(dateStr);
      const infoBlock = document.getElementById('selected-date-info');
      const title = document.getElementById('selected-date-title');
      const lessonsContainer = document.getElementById('selected-date-lessons');
    
      title.textContent = `Занятия на ${dateStr}`;
      lessonsContainer.innerHTML = '';
    
      if (lessons.length === 0) {
        lessonsContainer.innerHTML = '<p>Нет занятий</p>';
      } else {
        for (const lesson of lessons) {
          const student = allStudents.find(s => s.id === lesson.studentId);
          const div = document.createElement('div');
          div.className = 'lesson-entry';
          // div.innerHTML = `
          //   <strong>${student?.fullName || 'Неизвестный ученик'}</strong> — ${lesson.time || 'время не указано'}
          //   ${lesson.zoomLink ? `<br><a href="${lesson.zoomLink}" target="_blank">Zoom</a>` : ''}
          // `;

          let zoomDetails = '';
          if (lesson.zoomLink) {
            zoomDetails += `<br><a href="${lesson.zoomLink}" target="_blank">Zoom</a>`;
          }
          if (lesson.zoomId) {
            zoomDetails += `<br>ID: ${lesson.zoomId}`;
          }
          if (lesson.zoomPassword) {
            zoomDetails += `<br>Пароль: ${lesson.zoomPassword}`;
          }
          div.innerHTML = `
            <strong>${student?.fullName || 'Неизвестный ученик'}</strong> — ${lesson.time || 'время не указано'}
            ${zoomDetails}
          `;
          
          lessonsContainer.appendChild(div);
        }
      }
    
      infoBlock.classList.remove('hidden');
    }

    // ==================== АКТИВНОСТЬ НА СЕГОДНЯ ====================
    async function renderTodayActivity() {
      const todayStr = formatDate(new Date());
      const lessons = await fetchLessonsForDate(todayStr);
      const container = document.getElementById('today-lessons');
      container.innerHTML = '';
      if (lessons.length === 0) {
        container.innerHTML = '<p>На сегодня встреч нет</p>';
      } else {
        for (const lesson of lessons) {
          const student = allStudents.find(s => s.id === lesson.studentId);
          const div = document.createElement('div');
          div.style.marginBottom = '5px';
          
          // div.innerHTML = `${student?.fullName || 'Ученик'} — ${lesson.time} ${lesson.zoomLink ? `(<a href="${lesson.zoomLink}" target="_blank">Zoom</a>)` : ''}`;

          let zoomInfo = '';
          if (lesson.zoomLink) {
            zoomInfo += `<a href="${lesson.zoomLink}" target="_blank">Zoom</a>`;
          }
          if (lesson.zoomId) {
            zoomInfo += ` | ID: ${lesson.zoomId}`;
          }
          if (lesson.zoomPassword) {
            zoomInfo += ` | Пароль: ${lesson.zoomPassword}`;
          }
          div.innerHTML = `${student?.fullName || 'Ученик'} — ${lesson.time} ${zoomInfo ? `(${zoomInfo})` : ''}`;
          
          container.appendChild(div);
        }
      }
    }

    // ==================== КАБИНЕТ УЧЕНИКА ====================
    async function renderStudentLessons(studentId) {
      const lessons = await fetchLessonsForStudent(studentId);
      const todayStr = formatDate(new Date());
      const upcoming = lessons
        .filter(l => parseDate(l.date) >= parseDate(todayStr))
        .sort((a,b) => parseDate(a.date) - parseDate(b.date));
      
      const container = document.getElementById('student-lessons');
      container.innerHTML = '';
      if (upcoming.length === 0) {
        container.innerHTML = '<p>Нет предстоящих занятий</p>';
      } else {
        upcoming.forEach(lesson => {
          const card = document.createElement('div');
          card.className = 'lesson-card';
          card.innerHTML = `
            <h4>${lesson.date} в ${lesson.time || 'не указано'}</h4>

            ${lesson.zoomLink ? `<p>Zoom: <a href="${lesson.zoomLink}" target="_blank">${lesson.zoomLink}</a></p>` : ''}
            ${lesson.zoomId ? `<p>ID конференции: ${lesson.zoomId}</p>` : ''}
            ${lesson.zoomPassword ? `<p>Пароль: ${lesson.zoomPassword}</p>` : ''}
              
            <div class="homework">
              <strong>Домашнее задание:</strong><br>
              ${lesson.homework?.fileName ? `<a href="${lesson.homework.fileUrl}" target="_blank">${lesson.homework.fileName}</a>` : 'Нет файла'}
              ${lesson.homework?.comment ? `<p>Комментарий: ${lesson.homework.comment}</p>` : ''}
            </div>
          `;
          container.appendChild(card);
        });
      }
    }

    // ==================== УВЕДОМЛЕНИЯ ====================
    async function checkTodayNotifications() {
      const todayStr = formatDate(new Date());
      const lessons = await fetchLessonsForDate(todayStr);
      if (lessons.length > 0) {
        if (currentUser.type === 'teacher') {
          const names = lessons.map(l => allStudents.find(s => s.id === l.studentId)?.fullName || 'ученик').join(', ');
          showToast(`Сегодня у вас ${lessons.length} встреч(и): ${names}`);
        } else {
          const studentLessons = lessons.filter(l => l.studentId === currentUser.data.id);
          if (studentLessons.length > 0) {
            showToast(`У вас сегодня занятие в ${studentLessons[0].time || 'назначенное время'}`);
          }
        }
      }
    }

    // Периодическая проверка уведомлений (раз в минуту)
    setInterval(() => {
      if (currentUser) checkTodayNotifications();
    }, 60000);

    // ==================== ПЕРЕКЛЮЧЕНИЕ МЕСЯЦЕВ (опционально) ====================
    // Добавим кнопки навигации по календарю
  
    // document.querySelector('.right-panel').insertAdjacentHTML('afterend', `
    //   <div style="display:flex; gap:10px; margin-bottom:10px; margin-top:10px;">
    //     <button id="prev-month">Пред.месяц</button>
    //     <button id="next-month">След.месяц</button>
    //   </div>
    // `);
  
    document.getElementById('prev-month').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar(currentYear, currentMonth);
    });
    document.getElementById('next-month').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderCalendar(currentYear, currentMonth);
    });

    // Инициализация
    (async () => {
      await fetchStudents(); // кэшируем список студентов
      const session = loadSession();
      if (!session) return;
    
      if (session.type === 'teacher') {
        currentUser = { type: 'teacher' };
        enterTeacherMode();
      } else if (session.type === 'student' && session.studentId) {
        const student = allStudents.find(s => s.id === session.studentId);
        if (student) {
          currentUser = { type: 'student', data: student };
          enterStudentMode(student);
        } else {
          clearSession();
        }
      }
    })();

    function saveSession(sessionData) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
    
    function clearSession() {
      localStorage.removeItem(SESSION_KEY);
    }
    
    function loadSession() {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }

  // ==================== МАТЕРИАЛЫ ====================

  // Загрузка списка материалов и отображение в указанном контейнере
  async function renderMaterials(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<p>Загрузка...</p>';
    
    try {
      const snapshot = await database.ref('materials').once('value');
      const materials = [];
      snapshot.forEach(child => {
        materials.push({ id: child.key, ...child.val() });
      });
      
      // Сортировка по дате загрузки (новые сверху)
      materials.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
      
      if (materials.length === 0) {
        container.innerHTML = '<p>Материалов пока нет</p>';
        return;
      }
      
      container.innerHTML = '';
      materials.forEach(mat => {
        const div = document.createElement('div');
        div.className = 'material-item';
        div.innerHTML = `
          <a href="${mat.fileData}" target="_blank" download="${mat.fileName}">${mat.fileName}</a>
          <span class="material-date">${mat.uploadedAt ? new Date(mat.uploadedAt).toLocaleString('ru-RU') : ''}</span>
        `;
        container.appendChild(div);
      });
    } catch (error) {
      console.error('Ошибка загрузки материалов:', error);
      container.innerHTML = '<p>Ошибка загрузки материалов</p>';
    }
  }
  
  // Обработчик кнопки загрузки материала (только для преподавателя)
  document.getElementById('upload-material-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('material-file');
    const file = fileInput.files[0];
    if (!file) {
      alert('Выберите файл для загрузки');
      return;
    }
    
    // Проверка типа файла
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      alert('Недопустимый тип файла. Разрешены: pdf, doc, docx, xls, xlsx, txt');
      return;
    }
    
    try {
      const fileData = await readFileAsDataURL(file);
      await database.ref('materials').push({
        fileName: file.name,
        fileData: fileData,
        uploadedAt: Date.now()
      });
      fileInput.value = '';
      alert('Материал загружен');
      renderMaterials('materials-list');
    } catch (error) {
      console.error('Ошибка загрузки материала:', error);
      alert('Ошибка загрузки материала');
    }
  });
  
});
