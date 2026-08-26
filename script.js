document.addEventListener('DOMContentLoaded', function () {
  
    // ---- Данные учеников (начальные файлы) ----
    const studentData = {
      vaskov: {
        files: [
          { name: 'задание_1.docx', comment: 'Проверить к пятнице' },
          { name: 'урок_3.pdf', comment: '' }
        ],
        zoomLink: ''
      },
      popkova: {
        files: [
          { name: 'тест_2.pdf', comment: 'Обратить внимание на задание 5' }
        ],
        zoomLink: ''
      }
    };

    // ---- Рендеринг таблицы для ученика ----
    function renderHomework(studentId) {
      const data = studentData[studentId];
      const table = document.getElementById('hw-' + studentId);
      if (!table) return;
      const tbody = table.querySelector('tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      data.files.forEach((file, index) => {
        const tr = document.createElement('tr');
        const tdLeft = document.createElement('td');
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-cell';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-name';
        const ext = file.name.split('.').pop().toLowerCase();
        let icon = 'fa-file';
        let iconClass = '';
        if (ext === 'pdf') { icon = 'fa-file-pdf'; iconClass = 'pdf'; }
        else if (ext === 'doc' || ext === 'docx') { icon = 'fa-file-word'; iconClass = 'docx'; }
        else if (ext === 'txt') { icon = 'fa-file-alt'; }
        else if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') { icon = 'fa-file-image'; }
        nameSpan.innerHTML = `<i class="fas ${icon} ${iconClass}"></i> ${file.name}`;
        fileDiv.appendChild(nameSpan);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-remove';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.title = 'Удалить файл';
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          data.files.splice(index, 1);
          renderHomework(studentId);
        });
        fileDiv.appendChild(removeBtn);
        tdLeft.appendChild(fileDiv);

        const tdRight = document.createElement('td');
        tdRight.className = 'comment-cell';
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Комментарий к файлу...';
        textarea.value = file.comment || '';
        textarea.addEventListener('input', function() {
          data.files[index].comment = this.value;
        });
        tdRight.appendChild(textarea);

        tr.appendChild(tdLeft);
        tr.appendChild(tdRight);
        tbody.appendChild(tr);
      });

      // Обновляем Zoom
      const displaySpan = document.getElementById('zoomDisplay-' + studentId);
      if (displaySpan) {
        if (data.zoomLink) {
          displaySpan.textContent = data.zoomLink;
          displaySpan.style.display = 'inline';
        } else {
          displaySpan.textContent = '';
          displaySpan.style.display = 'none';
        }
      }
      const inputZoom = document.getElementById('zoomInput-' + studentId);
      if (inputZoom) {
        inputZoom.value = data.zoomLink || '';
      }
    }

    // ---- Загрузка файла ----
    function setupFileUpload(studentId) {
      const input = document.getElementById('fileInput-' + studentId);
      const statusSpan = document.getElementById('status-' + studentId);
      if (!input) return;
      input.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) {
          statusSpan.textContent = '';
          return;
        }
        const data = studentData[studentId];
        data.files.push({ name: file.name, comment: '' });
        renderHomework(studentId);
        statusSpan.textContent = `Файл "${file.name}" добавлен`;
        this.value = '';
        setTimeout(() => { if (statusSpan) statusSpan.textContent = ''; }, 3000);
      });
    }

    // ---- Сохранение Zoom ----
    function setupZoomSave(studentId) {
      const btn = document.querySelector(`.zoom-save[data-student="${studentId}"]`);
      const input = document.getElementById('zoomInput-' + studentId);
      if (!btn || !input) return;
      btn.addEventListener('click', function() {
        const link = input.value.trim();
        studentData[studentId].zoomLink = link;
        renderHomework(studentId);
      });
    }

    // ---- Инициализация ----
    function initStudent(studentId) {
      renderHomework(studentId);
      setupFileUpload(studentId);
      setupZoomSave(studentId);
    }

    // ---- Аккордеон ----
    document.querySelectorAll('.student-card').forEach(card => {
      card.addEventListener('click', function(e) {
        if (e.target.closest('.student-panel') && !e.target.closest('.student-card-header')) {
          if (e.target.closest('.file-remove') || e.target.closest('.zoom-save') ||
              e.target.closest('input') || e.target.closest('label')) {
            return;
          }
        }
        this.classList.toggle('expanded');
      });
    });

    // Запускаем для каждого ученика
    initStudent('vaskov');
    initStudent('popkova');

});
