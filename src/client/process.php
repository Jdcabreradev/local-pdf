<?php
header('Content-Type: application/json');

// Directorio para guardar los archivos PDF subidos
$uploadDir = 'uploads/';

// Crear el directorio si no existe
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Verificar si se ha enviado un archivo
if (isset($_FILES['pdfFile'])) {
    $file = $_FILES['pdfFile'];
    
    // Verificar errores
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al subir el archivo: ' . getUploadErrorMessage($file['error'])
        ]);
        exit;
    }
    
    // Verificar tipo de archivo
    $fileType = mime_content_type($file['tmp_name']);
    if ($fileType !== 'application/pdf') {
        echo json_encode([
            'success' => false,
            'message' => 'El archivo debe ser un PDF.'
        ]);
        exit;
    }
    
    // Generar nombre único para el archivo
    $fileName = uniqid() . '_' . basename($file['name']);
    $targetFilePath = $uploadDir . $fileName;
    
    // Mover el archivo al directorio de destino
    if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
        // Aquí podrías procesar el PDF con tu sistema de IA
        // Por ejemplo, extraer texto, indexarlo, etc.
        
        echo json_encode([
            'success' => true,
            'message' => 'Archivo subido correctamente',
            'fileName' => $fileName,
            'filePath' => $targetFilePath
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error al guardar el archivo.'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'No se ha enviado ningún archivo.'
    ]);
}

// Función para obtener mensajes de error de subida
function getUploadErrorMessage($errorCode) {
    switch ($errorCode) {
        case UPLOAD_ERR_INI_SIZE:
            return 'El archivo excede el tamaño máximo permitido por el servidor.';
        case UPLOAD_ERR_FORM_SIZE:
            return 'El archivo excede el tamaño máximo permitido por el formulario.';
        case UPLOAD_ERR_PARTIAL:
            return 'El archivo se subió parcialmente.';
        case UPLOAD_ERR_NO_FILE:
            return 'No se subió ningún archivo.';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Falta la carpeta temporal del servidor.';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Error al escribir el archivo en el disco.';
        case UPLOAD_ERR_EXTENSION:
            return 'Una extensión de PHP detuvo la subida del archivo.';
        default:
            return 'Error desconocido.';
    }
}
?>