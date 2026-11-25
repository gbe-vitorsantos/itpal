// c:\xampp2\htdocs\itpal\js\app.js

document.addEventListener('DOMContentLoaded', () => {
    // State
    let notes = [];
    let activeTags = new Set();
    let currentSearchTerm = '';
    let currentViewingNote = null;
    let categories = [];
    let activeCategory = null; // null = todas, 'none' = sem categoria, ou id da categoria

    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const notesGrid = document.getElementById('notesGrid');
    const notesStatus = document.getElementById('notesStatus');
    const tagsContainer = document.getElementById('tagsContainer');
    const searchTagsInput = document.getElementById('searchTagsInput');
    const btnClearFilters = document.getElementById('btnClearFilters');
    const btnNewNote = document.getElementById('btnNewNote');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const appLogo = document.getElementById('appLogo');
    
    // Theme Toggle Elements
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const iconMoon = document.getElementById('iconMoon');
    const iconSun = document.getElementById('iconSun');
    
    // Modal Elements (Edit)
    const modalOverlay = document.getElementById('noteModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelNote = document.getElementById('btnCancelNote');
    const noteForm = document.getElementById('noteForm');
    const modalTitle = document.getElementById('modalTitle');
    const noteIdInput = document.getElementById('noteId');
    const noteTitleInput = document.getElementById('noteTitle');
    const noteTagsInput = document.getElementById('noteTags');
    const imageFileInput = document.getElementById('imageFileInput');
    const noteCategorySelect = document.getElementById('noteCategory');
    const noteCategoryQuick = document.getElementById('noteCategoryQuick');
    const categoryBar = document.getElementById('categoryBar');
    const categoriesModal = document.getElementById('categoriesModal');
    const btnCloseCategories = document.getElementById('btnCloseCategories');
    const categoryNewForm = document.getElementById('categoryNewForm');
    const newCategoryName = document.getElementById('newCategoryName');
    const newCategoryColor = document.getElementById('newCategoryColor');
    const newCategoryFrequent = document.getElementById('newCategoryFrequent');
    const categoryList = document.getElementById('categoryList');
    const btnSaveNote = document.getElementById('btnSaveNote');
    const btnDeleteNote = document.getElementById('btnDeleteNote');

    // Modal Elements (View)
    const viewModalOverlay = document.getElementById('viewModal');
    const viewModalTitle = document.getElementById('viewModalTitle');
    const viewModalDate = document.getElementById('viewModalDate');
    const viewModalTags = document.getElementById('viewModalTags');
    const viewModalContent = document.getElementById('viewModalContent');
    const btnCloseViewModal = document.getElementById('btnCloseViewModal');
    const btnEditFromView = document.getElementById('btnEditFromView');
    const btnDeleteFromView = document.getElementById('btnDeleteFromView');

    // Editor WYSIWYG (Quill)
    const quill = new Quill('#noteEditor', {
        theme: 'snow',
        placeholder: 'Instruções passo a passo...',
        modules: {
            toolbar: {
                container: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ color: [] }, { background: [] }],
                    [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
                    [{ indent: '-1' }, { indent: '+1' }, { align: [] }],
                    ['blockquote', 'code-block', 'link', 'image'],
                    ['clean']
                ],
                handlers: {
                    image: () => imageFileInput.click()
                }
            },
            // Imagens coladas / arrastadas para o editor são enviadas para o servidor
            uploader: {
                mimetypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
                handler(range, files) {
                    files.reduce((p, file) => p.then(() => insertUploadedImage(file, quill.getSelection() || range)), Promise.resolve());
                }
            }
        }
    });
    translateToolbar();

    imageFileInput.addEventListener('change', () => {
        const file = imageFileInput.files[0];
        imageFileInput.value = '';
        if (file) insertUploadedImage(file, quill.getSelection(true));
    });

    // Initialize Theme
    const savedTheme = localStorage.getItem('itpal_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-theme');
        iconMoon.style.display = 'none';
        iconSun.style.display = 'block';
    }

    // Init
    fetchCategories().then(fetchNotes);

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase();
        renderNotes();
    });

    btnNewNote.addEventListener('click', openNewModal);
    
    // Edit Modal Listeners
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelNote.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    btnSaveNote.addEventListener('click', saveNote);
    btnDeleteNote.addEventListener('click', () => {
        if(confirm('Tem a certeza que deseja apagar esta nota?')) {
            deleteNoteById(noteIdInput.value).then(closeModal);
        }
    });

    // View Modal Listeners
    btnCloseViewModal.addEventListener('click', closeViewModal);
    viewModalOverlay.addEventListener('click', (e) => {
        if (e.target === viewModalOverlay) closeViewModal();
    });
    btnEditFromView.addEventListener('click', () => {
        const noteToEdit = currentViewingNote;
        closeViewModal();
        if(noteToEdit) openEditModal(noteToEdit);
    });
    btnDeleteFromView.addEventListener('click', () => {
        if(confirm('Tem a certeza que deseja apagar esta nota?')) {
            deleteNoteById(currentViewingNote.id).then(closeViewModal);
        }
    });

    // Categorias
    noteCategorySelect.addEventListener('change', renderCategoryQuick);
    btnCloseCategories.addEventListener('click', closeCategoriesModal);
    categoriesModal.addEventListener('click', (e) => {
        if (e.target === categoriesModal) closeCategoriesModal();
    });
    categoryNewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = newCategoryName.value.trim();
        if (!name) return;
        const created = await categoryRequest('POST', {
            name, color: newCategoryColor.value, is_frequent: newCategoryFrequent.checked
        });
        if (created) {
            newCategoryName.value = '';
            newCategoryFrequent.checked = false;
            newCategoryColor.value = nextColor();
            newCategoryName.focus();
        }
    });

    btnClearFilters.addEventListener('click', () => {
        activeTags.clear();
        renderTags();
        renderNotes();
    });

    appLogo.addEventListener('click', () => {
        activeTags.clear();
        activeCategory = null;
        searchInput.value = '';
        currentSearchTerm = '';
        renderTags();
        renderNotes();
    });

    btnThemeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        
        if (isDark) {
            iconMoon.style.display = 'none';
            iconSun.style.display = 'block';
            localStorage.setItem('itpal_theme', 'dark');
        } else {
            iconMoon.style.display = 'block';
            iconSun.style.display = 'none';
            localStorage.setItem('itpal_theme', 'light');
        }
    });

    searchTagsInput.addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        const tagElements = tagsContainer.querySelectorAll('.tag-filter');
        tagElements.forEach(el => {
            const tagName = el.querySelector('span').textContent.toLowerCase();
            el.style.display = tagName.includes(filter) ? 'flex' : 'none';
        });
    });

    btnToggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // API Calls
    async function fetchNotes() {
        try {
            notesStatus.textContent = 'A carregar notas...';
            notesStatus.style.display = 'block';
            notesGrid.innerHTML = '';

            const response = await fetch('api/notes.php');
            if (!response.ok) throw new Error('Erro na rede');
            
            notes = await response.json();
            
            if (notes.error) throw new Error(notes.error);

            renderTags();
            renderNotes();
        } catch (error) {
            console.error('Error fetching notes:', error);
            notesStatus.textContent = 'Erro ao carregar as notas. Verifique a consola.';
        }
    }

    async function saveNote() {
        if (!noteForm.checkValidity()) {
            noteForm.reportValidity();
            return;
        }

        const id = noteIdInput.value;
        const noteData = {
            title: noteTitleInput.value,
            tags: noteTagsInput.value,
            description: getEditorHtml(),
            category_id: noteCategorySelect.value || null
        };

        const method = id ? 'PUT' : 'POST';
        if (id) noteData.id = id;

        try {
            btnSaveNote.disabled = true;
            btnSaveNote.textContent = 'A guardar...';

            const response = await fetch('api/notes.php', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            });

            if (!response.ok) throw new Error('Erro ao guardar');

            const savedNote = await response.json();
            if (savedNote.error) throw new Error(savedNote.error);

            if (id) {
                const index = notes.findIndex(n => n.id == id);
                if (index !== -1) notes[index] = savedNote;
            } else {
                notes.unshift(savedNote); // Add to top
            }

            closeModal();
            renderTags();
            renderNotes();
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Erro ao guardar a nota.');
        } finally {
            btnSaveNote.disabled = false;
            btnSaveNote.textContent = 'Guardar';
        }
    }

    async function deleteNoteById(id) {
        if (!id) return;
        try {
            const response = await fetch('api/notes.php', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });

            if (!response.ok) throw new Error('Erro ao apagar');

            notes = notes.filter(n => n.id != id);
            
            renderTags();
            renderNotes();
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Erro ao apagar a nota.');
        }
    }

    // Rendering
    function renderTags() {
        const tagCounts = {};
        
        notes.forEach(note => {
            if (!note.tags) return;
            const tags = note.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
            tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.keys(tagCounts).sort((a, b) => a.localeCompare(b));

        tagsContainer.innerHTML = '';
        
        if (sortedTags.length === 0) {
            tagsContainer.innerHTML = '<div class="loading-text">Nenhuma tag encontrada.</div>';
            btnClearFilters.style.display = 'none';
            searchTagsInput.style.display = 'none';
            return;
        }

        btnClearFilters.style.display = activeTags.size > 0 ? 'inline-block' : 'none';
        searchTagsInput.style.display = 'block';

        sortedTags.forEach(tag => {
            const div = document.createElement('div');
            div.className = `tag-filter ${activeTags.has(tag) ? 'active' : ''}`;
            
            const spanName = document.createElement('span');
            spanName.textContent = tag;
            
            const spanCount = document.createElement('span');
            spanCount.className = 'tag-count';
            spanCount.textContent = tagCounts[tag];
            
            div.appendChild(spanName);
            div.appendChild(spanCount);

            div.addEventListener('click', () => {
                if (activeTags.has(tag)) {
                    activeTags.delete(tag);
                } else {
                    activeTags.add(tag);
                }
                renderTags(); 
                renderNotes();
            });

            tagsContainer.appendChild(div);
        });
    }

    function renderNotes() {
        const filteredNotes = notes.filter(note => {
            const category = getCategory(note.category_id);
            const searchableText = `${note.title} ${note.tags} ${category ? category.name : ''} ${descriptionToText(note.description)}`.toLowerCase();
            
            // Dividir os termos de pesquisa por espaços e garantir que todas as palavras existem no texto
            const searchTerms = currentSearchTerm.split(/\s+/).filter(t => t);
            const matchesSearch = searchTerms.every(term => searchableText.includes(term));

            let matchesTags = true;
            if (activeTags.size > 0) {
                const noteTags = note.tags ? note.tags.toLowerCase().split(',').map(t => t.trim()) : [];
                for (let activeTag of activeTags) {
                    if (!noteTags.includes(activeTag)) {
                        matchesTags = false;
                        break;
                    }
                }
            }

            let matchesCategory = true;
            if (activeCategory === 'none') matchesCategory = !category;
            else if (activeCategory !== null) matchesCategory = category && category.id == activeCategory;

            return matchesSearch && matchesTags && matchesCategory;
        });

        notesGrid.innerHTML = '';
        renderCategoryBar();

        if (filteredNotes.length === 0) {
            notesStatus.style.display = 'block';
            notesStatus.textContent = notes.length === 0 ? 'Não existem notas. Crie a primeira!' : 'Nenhuma nota encontrada com os filtros atuais.';
            return;
        }

        notesStatus.style.display = 'none';

        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.addEventListener('click', () => openViewModal(note));

            // Header
            const header = document.createElement('div');
            header.className = 'note-header';
            
            const title = document.createElement('h3');
            title.innerHTML = highlightText(escapeHtml(note.title), currentSearchTerm);
            
            const dateStr = new Date(note.updated_at).toLocaleDateString('pt-PT', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
            });
            const date = document.createElement('div');
            date.className = 'note-date';
            date.textContent = dateStr;

            const cardCategory = getCategory(note.category_id);
            if (cardCategory) header.appendChild(createCategoryBadge(cardCategory));
            header.appendChild(title);
            header.appendChild(date);

            // Tags
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'note-tags';
            if (note.tags) {
                const tags = note.tags.split(',').map(t => t.trim()).filter(t => t);
                tags.forEach(tag => {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'note-tag';
                    tagSpan.innerHTML = highlightText(escapeHtml(tag), currentSearchTerm);
                    tagsDiv.appendChild(tagSpan);
                });
            }

            // Preview (Stripping markdown for the card)
            const previewDiv = document.createElement('div');
            previewDiv.className = 'note-preview';
            if (note.description) {
                const rawText = descriptionToText(note.description);
                previewDiv.innerHTML = highlightText(escapeHtml(rawText), currentSearchTerm);
            }

            card.appendChild(header);
            if (tagsDiv.children.length > 0) card.appendChild(tagsDiv);
            if (note.description) card.appendChild(previewDiv);

            notesGrid.appendChild(card);
        });
    }

    // Modal Handling
    function openNewModal() {
        modalTitle.textContent = 'Nova Nota';
        noteForm.reset();
        noteIdInput.value = '';
        setEditorHtml('');
        // Nova nota herda a categoria do filtro ativo
        setCategorySelect(activeCategory !== null && activeCategory !== 'none' ? activeCategory : '');
        btnDeleteNote.style.display = 'none';
        modalOverlay.classList.add('active');
        noteTitleInput.focus();
        sidebar.classList.remove('open');
    }

    function openEditModal(note) {
        modalTitle.textContent = 'Editar Nota';
        noteIdInput.value = note.id;
        noteTitleInput.value = note.title;
        noteTagsInput.value = note.tags;
        setEditorHtml(note.description);
        setCategorySelect(note.category_id || '');
        btnDeleteNote.style.display = 'flex';
        modalOverlay.classList.add('active');
        noteTitleInput.focus();
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
    }

    function openViewModal(note) {
        currentViewingNote = note;
        viewModalTitle.textContent = note.title;
        
        const dateStr = new Date(note.updated_at).toLocaleDateString('pt-PT', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
        });
        viewModalDate.textContent = `Atualizado a ${dateStr}`;

        viewModalTags.innerHTML = '';
        if (note.tags) {
            const tags = note.tags.split(',').map(t => t.trim()).filter(t => t);
            tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'note-tag';
                tagSpan.textContent = tag;
                viewModalTags.appendChild(tagSpan);
            });
        }

        const viewCategory = getCategory(note.category_id);
        if (viewCategory) viewModalTags.prepend(createCategoryBadge(viewCategory));
        viewModalTags.parentElement.style.display = viewModalTags.children.length ? '' : 'none';

        const html = descriptionToHtml(note.description);
        viewModalContent.innerHTML = html ? sanitizeHtml(html) : '<p><em>Sem descrição</em></p>';
        viewModalContent.querySelectorAll('a').forEach(a => {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        });
        viewModalContent.closest('.modal-body').scrollTop = 0;

        viewModalOverlay.classList.add('active');
    }

    function closeViewModal() {
        viewModalOverlay.classList.remove('active');
        currentViewingNote = null;
    }

    // ===== Categorias =====
    const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#84cc16', '#f97316', '#64748b'];

    function nextColor() {
        const used = new Set(categories.map(c => c.color));
        return CATEGORY_COLORS.find(c => !used.has(c)) || CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
    }

    function getCategory(id) {
        if (!id) return null;
        return categories.find(c => c.id == id) || null;
    }

    function sortCategories() {
        categories.sort((a, b) => (b.is_frequent - a.is_frequent) || a.name.localeCompare(b.name, 'pt'));
    }

    async function fetchCategories() {
        try {
            const response = await fetch('api/categories.php');
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || 'Erro na rede');
            categories = data.map(c => ({ ...c, is_frequent: Number(c.is_frequent) }));
            sortCategories();
        } catch (error) {
            console.error('Error fetching categories:', error);
            categories = [];
        }
        newCategoryColor.value = nextColor();
        renderCategoryOptions();
    }

    // Pedido à API de categorias; atualiza o estado e a interface. Devolve o resultado ou null.
    async function categoryRequest(method, body) {
        try {
            const response = await fetch('api/categories.php', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.error || 'Erro');

            if (method === 'DELETE') {
                categories = categories.filter(c => c.id != body.id);
                notes.forEach(n => { if (n.category_id == body.id) n.category_id = null; });
                if (activeCategory == body.id) activeCategory = null;
            } else {
                result.is_frequent = Number(result.is_frequent);
                const i = categories.findIndex(c => c.id == result.id);
                if (i === -1) categories.push(result); else categories[i] = result;
            }
            sortCategories();
            renderCategoryOptions();
            renderCategoryList();
            renderNotes();
            return result;
        } catch (error) {
            alert(error.message);
            renderCategoryList();
            return null;
        }
    }

    function countByCategory() {
        const counts = { none: 0 };
        notes.forEach(n => {
            const key = getCategory(n.category_id) ? n.category_id : 'none';
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }

    function createCategoryBadge(category) {
        const badge = document.createElement('span');
        badge.className = 'category-badge';
        badge.style.setProperty('--cat-color', category.color);
        badge.textContent = category.name;
        return badge;
    }

    function setActiveCategory(value) {
        activeCategory = (activeCategory == value && value !== null) ? null : value;
        renderNotes();
    }

    // Barra por cima das notas: "Todas", frequentes em destaque, restantes num menu
    function renderCategoryBar() {
        const counts = countByCategory();
        categoryBar.innerHTML = '';

        const makeChip = (label, value, category) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'category-chip' + (activeCategory == value && (value !== null || activeCategory === null) ? ' active' : '');
            if (category) {
                chip.style.setProperty('--cat-color', category.color);
                chip.classList.add('has-color');
            }
            const name = document.createElement('span');
            name.textContent = label;
            chip.appendChild(name);
            const count = value === null ? notes.length : (counts[value] || 0);
            const countEl = document.createElement('span');
            countEl.className = 'chip-count';
            countEl.textContent = count;
            chip.appendChild(countEl);
            chip.addEventListener('click', () => setActiveCategory(value));
            return chip;
        };

        categoryBar.appendChild(makeChip('Todas', null));

        const frequent = categories.filter(c => c.is_frequent);
        const others = categories.filter(c => !c.is_frequent);
        frequent.forEach(c => categoryBar.appendChild(makeChip('★ ' + c.name, String(c.id), c)));

        // Categoria ativa que não é frequente também aparece como chip
        const activeOther = others.find(c => c.id == activeCategory);
        if (activeOther) categoryBar.appendChild(makeChip(activeOther.name, String(activeOther.id), activeOther));
        if (activeCategory === 'none') categoryBar.appendChild(makeChip('Sem categoria', 'none'));

        if (others.length > 0 || counts.none > 0) {
            const select = document.createElement('select');
            select.className = 'category-more';
            select.innerHTML = '<option value="">Outras categorias…</option>';
            others.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.name} (${counts[c.id] || 0})`;
                select.appendChild(opt);
            });
            if (counts.none > 0) {
                const opt = document.createElement('option');
                opt.value = 'none';
                opt.textContent = `Sem categoria (${counts.none})`;
                select.appendChild(opt);
            }
            select.addEventListener('change', () => {
                if (select.value) {
                    activeCategory = select.value;
                    renderNotes();
                }
            });
            categoryBar.appendChild(select);
        }

        const manage = document.createElement('button');
        manage.type = 'button';
        manage.className = 'btn btn-text category-manage';
        manage.textContent = categories.length ? 'Gerir categorias' : '+ Criar categorias';
        manage.addEventListener('click', openCategoriesModal);
        categoryBar.appendChild(manage);
    }

    // Select do editor: frequentes primeiro
    function renderCategoryOptions() {
        const current = noteCategorySelect.value;
        noteCategorySelect.innerHTML = '<option value="">Sem categoria</option>';
        const addGroup = (label, list) => {
            if (!list.length) return;
            const group = document.createElement('optgroup');
            group.label = label;
            list.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                group.appendChild(opt);
            });
            noteCategorySelect.appendChild(group);
        };
        addGroup('★ Frequentes', categories.filter(c => c.is_frequent));
        addGroup('Outras', categories.filter(c => !c.is_frequent));
        setCategorySelect(current);
    }

    function setCategorySelect(value) {
        noteCategorySelect.value = getCategory(value) ? String(value) : '';
        renderCategoryQuick();
    }

    // Atalhos no editor: um clique nas categorias frequentes
    function renderCategoryQuick() {
        noteCategoryQuick.innerHTML = '';
        categories.filter(c => c.is_frequent).forEach(c => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'category-chip has-color small' + (noteCategorySelect.value == c.id ? ' active' : '');
            chip.style.setProperty('--cat-color', c.color);
            chip.textContent = c.name;
            chip.addEventListener('click', () => {
                setCategorySelect(noteCategorySelect.value == c.id ? '' : c.id);
            });
            noteCategoryQuick.appendChild(chip);
        });
    }

    function openCategoriesModal() {
        renderCategoryList();
        categoriesModal.classList.add('active');
        newCategoryName.focus();
    }

    function closeCategoriesModal() {
        categoriesModal.classList.remove('active');
    }

    function renderCategoryList() {
        const counts = countByCategory();
        categoryList.innerHTML = '';
        if (!categories.length) {
            categoryList.innerHTML = '<div class="loading-text">Ainda não existem categorias.</div>';
            return;
        }
        categories.forEach(c => {
            const row = document.createElement('div');
            row.className = 'category-row';

            const star = document.createElement('button');
            star.type = 'button';
            star.className = 'category-star' + (c.is_frequent ? ' active' : '');
            star.textContent = c.is_frequent ? '★' : '☆';
            star.title = c.is_frequent ? 'Frequente (clique para remover)' : 'Marcar como frequente';
            star.addEventListener('click', () => categoryRequest('PUT', { id: c.id, is_frequent: !c.is_frequent }));

            const color = document.createElement('input');
            color.type = 'color';
            color.value = c.color;
            color.title = 'Cor';
            color.addEventListener('change', () => categoryRequest('PUT', { id: c.id, color: color.value }));

            const name = document.createElement('input');
            name.type = 'text';
            name.value = c.name;
            name.maxLength = 40;
            const saveName = () => {
                const v = name.value.trim();
                if (v && v !== c.name) categoryRequest('PUT', { id: c.id, name: v });
                else name.value = c.name;
            };
            name.addEventListener('change', saveName);
            name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } });

            const count = document.createElement('span');
            count.className = 'tag-count';
            count.textContent = counts[c.id] || 0;
            count.title = 'Notas nesta categoria';

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'btn-close';
            del.title = 'Apagar categoria';
            del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
            del.addEventListener('click', () => {
                const n = counts[c.id] || 0;
                const msg = n ? `Apagar a categoria "${c.name}"? As ${n} nota(s) desta categoria ficam sem categoria.` : `Apagar a categoria "${c.name}"?`;
                if (confirm(msg)) categoryRequest('DELETE', { id: c.id });
            });

            row.append(star, color, name, count, del);
            categoryList.appendChild(row);
        });
    }

    // Editor helpers
    function isHtml(text) {
        return /^\s*<(p|h[1-6]|ol|ul|pre|blockquote|div|img|br)[\s>\/]/i.test(text || '');
    }

    // Converte a descrição guardada (HTML novo ou texto/markdown antigo) em HTML
    function descriptionToHtml(description) {
        if (!description || !description.trim()) return '';
        if (isHtml(description)) return description;
        // Texto simples antigo: uma linha = um parágrafo, linhas vazias preservadas
        return description.replace(/\r\n?/g, '\n').split('\n')
            .map(line => line.trim() === '' ? '<p><br></p>' : '<p>' + escapeHtml(line) + '</p>')
            .join('');
    }

    function sanitizeHtml(html) {
        if (typeof DOMPurify === 'undefined') return escapeHtml(html);
        return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
    }

    function descriptionToText(description) {
        if (!description) return '';
        if (!isHtml(description)) return description.replace(/\s+/g, ' ').trim();
        const doc = new DOMParser().parseFromString(description, 'text/html');
        doc.querySelectorAll('.ql-ui').forEach(el => el.remove());
        doc.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, br').forEach(el => el.after(' '));
        return doc.body.textContent.replace(/\s+/g, ' ').trim();
    }

    function setEditorHtml(description) {
        const html = descriptionToHtml(description);
        if (html) {
            quill.setContents(quill.clipboard.convert({ html: sanitizeHtml(html) }), 'silent');
        } else {
            quill.setContents([], 'silent');
        }
        quill.history.clear();
    }

    function getEditorHtml() {
        const isEmpty = quill.getText().trim() === '' && !quill.root.querySelector('img');
        return isEmpty ? '' : quill.root.innerHTML;
    }

    async function insertUploadedImage(file, range) {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('A imagem é demasiado grande (máx. 10 MB).');
            return;
        }
        const index = range ? range.index : quill.getLength();
        const formData = new FormData();
        formData.append('image', file);
        try {
            btnSaveNote.disabled = true;
            btnSaveNote.textContent = 'A carregar imagem...';
            const response = await fetch('api/upload.php', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.error || 'Falha no upload');
            quill.insertEmbed(index, 'image', result.url, 'user');
            quill.setSelection(index + 1, 0, 'silent');
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Erro ao carregar a imagem: ' + error.message);
        } finally {
            btnSaveNote.disabled = false;
            btnSaveNote.textContent = 'Guardar';
        }
    }

    function translateToolbar() {
        const titles = {
            '.ql-header': 'Estilo do texto', '.ql-bold': 'Negrito', '.ql-italic': 'Itálico',
            '.ql-underline': 'Sublinhado', '.ql-strike': 'Rasurado', '.ql-color': 'Cor do texto',
            '.ql-background': 'Cor de realce', '.ql-list[value="ordered"]': 'Lista numerada',
            '.ql-list[value="bullet"]': 'Lista com marcas', '.ql-list[value="check"]': 'Lista de verificação',
            '.ql-indent[value="-1"]': 'Diminuir avanço', '.ql-indent[value="+1"]': 'Aumentar avanço',
            '.ql-align': 'Alinhamento', '.ql-blockquote': 'Citação', '.ql-code-block': 'Bloco de código',
            '.ql-link': 'Ligação', '.ql-image': 'Inserir imagem', '.ql-clean': 'Limpar formatação'
        };
        const toolbar = quill.getModule('toolbar').container;
        Object.entries(titles).forEach(([sel, title]) => {
            toolbar.querySelectorAll(sel).forEach(el => el.setAttribute('title', title));
        });
    }

    // Helpers
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function highlightText(text, term) {
        if (!term || term.trim() === '') return text;
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    function stripMarkdown(text) {
        if (!text) return '';
        // Uma limpeza muito básica de markdown para apresentar no preview
        return text
            .replace(/[#_*~`>]/g, '') // Remove caracteres comuns de markdown
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Substitui links pelo seu texto
            .trim();
    }
});
