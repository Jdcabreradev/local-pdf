<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fast PDF</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
</head>
<body>
    <div class="container">
        <header>
            <div class="title-container">
                
                <img src="img/logo.png" alt="Fast PDF Logo" class="header-logo">
            </div>
            <p class="subtitle">Usa esta herramienta para <span class="accent">resumir, buscar y comprender</span> textos con gran rapidez. Gratis y de uso personal.</p>
        </header>

        <div class="upload-container">
            <div class="upload-area" id="dropZone">
                <form id="uploadForm" enctype="multipart/form-data">
                    <input type="file" name="file" id="fileInput" accept=".pdf" hidden>
                    <div class="upload-icon">
                        <i class="fa-solid fa-file-arrow-up"></i>
                        <p>Haz clic para subir, o arrastra el PDF aquí</p>
                    </div>
                </form>
            </div>
        </div>

        <div class="content-container" id="mainContent" style="display: none;">
            <div class="pdf-viewer">
                <iframe id="pdfViewer" src=""></iframe>
            </div>
            <div class="chat-container" id="chatContainer">
                <div class="reset-button-container">
                    <button id="resetBtn" class="reset-btn">
                        <i class="fa-solid fa-rotate-right"></i>
                        Reiniciar
                    </button>
                </div>
                <div class="chat-messages" id="chatMessages">
                    <!-- Los mensajes del chat aparecerán aquí -->
                </div>
                <div class="chat-input">
                    <input type="text" id="messageInput" placeholder="Haz una pregunta sobre tu PDF...">
                    <button id="sendBtn">Enviar</button>
                </div>
            </div>
        </div>

        <footer class="disclaimer">
            <p>Sus PDF serán eliminados de la base de datos en el momento que salga de la herramienta y no serán usados para tratamiento de datos</p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const dropZone = document.getElementById('dropZone');
            const fileInput = document.getElementById('fileInput');
            const mainContent = document.getElementById('mainContent');
            const chatContainer = document.getElementById('chatContainer');
            const chatMessages = document.getElementById('chatMessages');
            const messageInput = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            const pdfViewer = document.getElementById('pdfViewer');
            const resetBtn = document.getElementById('resetBtn');

            // Prevenir el comportamiento por defecto para todos los eventos de drag
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
                document.body.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            // Manejar los eventos de drag para efectos visuales
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });

            function highlight(e) {
                dropZone.classList.add('dragover');
            }

            function unhighlight(e) {
                dropZone.classList.remove('dragover');
            }

            // Manejar el drop del archivo
            dropZone.addEventListener('drop', handleDrop, false);

            function handleDrop(e) {
                const dt = e.dataTransfer;
                const files = dt.files;

                if (files.length > 0 && files[0].type === 'application/pdf') {
                    handleFileUpload(files[0]);
                } else {
                    alert('Por favor, sube únicamente archivos PDF.');
                }
            }

            // Manejar click en la zona de upload
            dropZone.addEventListener('click', function() {
                fileInput.click();
            });

            // Manejar cambio en el input de archivo
            fileInput.addEventListener('change', function() {
                if (fileInput.files.length > 0) {
                    handleFileUpload(fileInput.files[0]);
                }
            });

            // Función para manejar la subida de archivos
            function handleFileUpload(file) {
                const formData = new FormData();
                formData.append('file', file);

                // Mostrar indicador de carga
                dropZone.innerHTML = '<p>Subiendo archivo...</p>';

                fetch('http://docker.host.internal:3000/uploads', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error en la subida: ' + response.status);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Respuesta del servidor:', data);

                    // Ocultar zona de subida y mostrar contenido principal
                    document.querySelector('.upload-container').style.display = 'none';
                    mainContent.style.display = 'flex';

                    // Crear URL local para el PDF
                    const pdfUrl = URL.createObjectURL(file);
                    pdfViewer.src = pdfUrl;

                    // Limpiar la URL cuando el iframe se cargue para liberar memoria
                    pdfViewer.onload = () => {
                        URL.revokeObjectURL(pdfUrl);
                    };

                    // Añadir mensaje de bienvenida
                    addMessage('bot', `¡Archivo "${file.name}" subido correctamente! ¿Qué te gustaría preguntar sobre este PDF?`);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error al subir el archivo. Por favor, inténtalo de nuevo.');
                    resetUploadZone();
                });
            }

            // Restablecer la zona de subida
            function resetUploadZone() {
                dropZone.innerHTML = `
                    <div class="upload-icon">
                        <img src="upload-icon.png" alt="Subir archivo">
                    </div>
                    <p>Haz clic para subir, o arrastra el PDF aquí</p>
                    <button type="button" class="upload-btn" id="uploadBtn">
                        <span class="icon">+</span> Subir PDF
                    </button>
                `;
                // Volver a añadir el evento al botón
                document.getElementById('uploadBtn').addEventListener('click', function() {
                    fileInput.click();
                });
            }

            // Manejar envío de mensajes
            sendBtn.addEventListener('click', sendMessage);
            messageInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });

            function sendMessage() {
                const message = messageInput.value.trim();
                if (message) {
                    // Añadir mensaje del usuario al chat
                    addMessage('user', message);
                    messageInput.value = '';

                    // Mostrar indicador de "escribiendo..."
                    const typingIndicator = document.createElement('div');
                    typingIndicator.className = 'message bot-message typing';
                    typingIndicator.innerHTML = '<p>Escribiendo...</p>';
                    chatMessages.appendChild(typingIndicator);
                    chatMessages.scrollTop = chatMessages.scrollHeight;

                    // Hacer la petición a la API
                    fetch('http://docker.host.internal:3000/chat/query', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            question: message
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        // Remover el indicador de "escribiendo..."
                        typingIndicator.remove();
                        
                        // Añadir la respuesta del bot
                        addMessage('bot', data.result);
                    })
                    .catch(error => {
                        // Remover el indicador de "escribiendo..."
                        typingIndicator.remove();
                        
                        // Mostrar mensaje de error
                        addMessage('bot', 'Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta de nuevo.');
                        console.error('Error:', error);
                    });
                }
            }

            function addMessage(sender, text) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${sender}-message`;
                messageDiv.innerHTML = `<p>${text}</p>`;
                chatMessages.appendChild(messageDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            // Manejar click en el botón de reinicio
            resetBtn.addEventListener('click', function() {
                window.location.href = window.location.pathname;
            });
        });
    </script>
</body>
</html>