<?php
header('Content-Type: application/json');

// Verificar si se recibió una solicitud POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Obtener los datos enviados
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['message']) && isset($data['fileName'])) {
        $message = $data['message'];
        $fileName = $data['fileName'];
        
        // Verificar que el archivo existe
        $filePath = 'uploads/' . $fileName;
        if (!file_exists($filePath)) {
            echo json_encode([
                'success' => false,
                'message' => 'El archivo PDF no se encuentra.'
            ]);
            exit;
        }
        
        // Aquí implementarías la lógica para procesar la pregunta con tu IA
        // Este es solo un ejemplo de respuesta simulada
        $response = simulateAIResponse($message, $filePath);
        
        echo json_encode([
            'success' => true,
            'response' => $response
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Faltan parámetros requeridos.'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido.'
    ]);
}

// Función para simular una respuesta de IA
function simulateAIResponse($message, $filePath) {
    // En una implementación real, aquí procesarías el PDF y la pregunta
    // utilizando alguna biblioteca de procesamiento de lenguaje natural o API externa
    
    $responses = [
        'Esta información se encuentra en la página 3 del documento.',
        'Según el PDF, la respuesta a tu pregunta es afirmativa.',
        'El documento no contiene información específica sobre ese tema.',
        'De acuerdo con el contenido del PDF, hay varios factores a considerar...',
        'La investigación mencionada en el documento sugiere que...',
    ];
    
    // Simular un tiempo de procesamiento
    sleep(1);
    
    // Devolver una respuesta aleatoria
    return $responses[array_rand($responses)];
}
?>