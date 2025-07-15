// Espera a que el DOM (Document Object Model) esté completamente cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {
    // Mensaje de depuración inicial para confirmar que el script se está cargando y ejecutando
    console.log("script.js cargado y DOMContentLoaded disparado. ¡Listo para interactuar!");

    // Seleccionar elementos del DOM por su ID para poder interactuar con ellos en JavaScript
    const topicInput = document.getElementById('topicInput'); // Campo de entrada de texto para el tema
    const generateBtn = document.getElementById('generateBtn'); // Botón para iniciar la generación de consejos
    const resultsDiv = document.getElementById('results'); // Área donde se mostrarán los resultados o mensajes

    // ========================================================================
    // ** ¡MUY IMPORTANTE! TU CLAVE API DE GEMINI ESTÁ INSERTADA AQUÍ **
    // Esta es tu credencial personal para acceder a los servicios de la API de Gemini.
    // ========================================================================
    const API_KEY = 'AIzaSyAqg5yDj_f5e7yVXB1bWWnwg6tETd-ULEk'; 

    /**
     * Función asíncrona para realizar una llamada a la API de Gemini.
     * Toma un texto de prompt y devuelve la respuesta generada por Gemini.
     * @param {string} promptText El texto del prompt que se enviará a la API de Gemini.
     * @returns {Promise<string>} Una promesa que se resuelve con el texto de la respuesta de Gemini.
     * @throws {Error} Lanza un error si hay problemas con la clave API, la llamada a la API falla,
     * o si Gemini no genera contenido (ej. por políticas de seguridad).
     */
    async function callGeminiAPI(promptText) {
        // Verifica que la clave API no sea el placeholder ni esté vacía (aunque ahora ya está insertada)
        if (!API_KEY || API_KEY === 'TU_CLAVE_API_DE_GEMINI_AQUI') { // Mantener esta verificación para futuros cambios
            console.error("Error: La clave API de Gemini no ha sido configurada.");
            throw new Error('Error de configuración: La clave API de Gemini no ha sido configurada. Por favor, asegúrate de que esté correctamente insertada.');
        }

        // Construye la URL completa del endpoint de la API de Gemini, incluyendo la clave API
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

        // Define el cuerpo de la solicitud HTTP POST en formato JSON
        // Esto es lo que la API de Gemini espera para procesar el prompt
        const requestBody = {
            contents: [{
                parts: [{
                    text: promptText
                }]
            }]
        };

        try {
            // Realiza la solicitud HTTP POST a la API de Gemini usando fetch
            const response = await fetch(API_URL, {
                method: 'POST', // Método HTTP POST para enviar datos
                headers: {
                    'Content-Type': 'application/json' // Indica que el cuerpo de la solicitud es JSON
                },
                body: JSON.stringify(requestBody) // Convierte el objeto JavaScript a una cadena JSON
            });

            // Verifica si la respuesta HTTP fue exitosa (códigos de estado 200-299)
            if (!response.ok) {
                let errorDetails = `Error HTTP: ${response.status}`; // Mensaje de error inicial con el código de estado
                try {
                    // Intenta parsear la respuesta de error de la API para obtener más detalles
                    const errorData = await response.json();
                    if (errorData.error && errorData.error.message) {
                        errorDetails += ` - ${errorData.error.message}`; // Añade el mensaje de error específico de la API
                    } else {
                        errorDetails += ` - ${JSON.stringify(errorData)}`; // Si no hay mensaje, muestra todo el JSON de error
                    }
                } catch (jsonError) {
                    // Si no se puede parsear el JSON, muestra el texto crudo de la respuesta como último recurso
                    errorDetails += ` - No se pudieron parsear los detalles del error. Texto de respuesta: ${await response.text()}`;
                }
                // Lanza un nuevo error con los detalles recopilados del fallo de la API
                throw new Error(`Fallo en la llamada a la API de Gemini: ${errorDetails}`);
            }

            // Parsea la respuesta exitosa de la API a un objeto JavaScript
            const data = await response.json();

            // Verifica si la respuesta contiene el contenido generado esperado (los "candidates")
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
                return data.candidates[0].content.parts[0].text; // Retorna el texto generado por Gemini
            } else if (data.promptFeedback && data.promptFeedback.safetyRatings) {
                // Si no hay contenido generado pero hay feedback de seguridad (contenido bloqueado)
                const safetyIssues = data.promptFeedback.safetyRatings
                    .filter(rating => rating.probability !== 'NEGLIGIBLE') // Filtra solo los problemas de seguridad relevantes
                    .map(rating => `${rating.category}: ${rating.probability}`) // Formatea los detalles del problema
                    .join(', '); // Une los problemas con comas
                // Lanza un error específico si el contenido fue bloqueado por políticas de seguridad
                throw new Error(`El contenido fue bloqueado debido a políticas de seguridad: ${safetyIssues}. Por favor, prueba con un tema diferente o reformula tu pregunta.`);
            } else {
                // Si no hay contenido ni feedback de seguridad claro, indica que Gemini no generó nada
                throw new Error('La API de Gemini no generó consejos. Esto puede deberse a un tema muy general, o a que no hay contenido relevante. Intenta con un tema más específico o reformula tu pregunta.');
            }

        } catch (error) {
            // Captura cualquier error que ocurra durante el proceso de la API (incluyendo los lanzados anteriormente)
            console.error('Error en callGeminiAPI (capturado y relanzado para UI):', error);
            throw error; // Re-lanza el error para que el manejador de clic pueda mostrarlo al usuario
        }
    }

    // Añade un "click listener" al botón de generar consejos
    generateBtn.addEventListener('click', async () => {
        // Obtiene el texto del campo de entrada y elimina espacios en blanco al principio/final
        const userTopic = topicInput.value.trim(); 

        // Si el campo de entrada está vacío, muestra un mensaje de advertencia y detiene la ejecución
        if (!userTopic) {
            resultsDiv.innerHTML = '<p style="color: #ffcccc;">Por favor, escribe un tema para obtener consejos de sostenibilidad.</p>';
            return;
        }

        // Muestra un mensaje de "Cargando..." en el área de resultados
        resultsDiv.innerHTML = '<p>Cargando consejos... Por favor, espera.</p>';
        
        // Deshabilita el botón para evitar que el usuario haga clic múltiples veces
        generateBtn.disabled = true;
        // Añade una clase CSS al botón para cambiar su apariencia mientras está cargando
        generateBtn.classList.add('loading'); 

        try {
            // Construye el prompt específico para Gemini, incorporando el tema del usuario
            // Se solicita 5 consejos breves y prácticos, enumerados como puntos.
            const geminiPrompt = `Dame 5 consejos breves y prácticos sobre "${userTopic}" para cuidar el medio ambiente. Enuméralos como puntos.`;

            // Llama a la función callGeminiAPI y espera a que la promesa se resuelva con la respuesta
            const responseText = await callGeminiAPI(geminiPrompt);

            // Procesa la respuesta de texto de Gemini para formatearla como una lista HTML
            // Divide el texto en líneas y filtra las líneas vacías
            const tipsArray = responseText.split('\n').filter(line => line.trim() !== '');
            let htmlContent = '';

            // Si se obtuvieron consejos, los formatea como una lista no ordenada (<ul>)
            if (tipsArray.length > 0) {
                htmlContent += '<ul>';
                tipsArray.forEach(tip => {
                    // Limpia posibles caracteres de lista (como '-' o '*') y espacios extra al inicio de cada consejo
                    htmlContent += `<li>${tip.replace(/^[*-]\s*/, '').trim()}</li>`;
                });
                htmlContent += '</ul>';
            } else {
                // Si no se generaron consejos a pesar de una respuesta exitosa, muestra un mensaje alternativo
                htmlContent = '<p>Gemini no pudo generar consejos específicos para este tema. Intenta con una pregunta diferente.</p>';
            }
            // Actualiza el contenido del div de resultados con los consejos formateados
            resultsDiv.innerHTML = htmlContent;

        } catch (error) {
            // Captura cualquier error que haya ocurrido durante el proceso (incluyendo los de callGeminiAPI)
            console.error('Error final al generar consejos (mostrando en UI):', error);
            // Muestra un mensaje de error detallado al usuario en el div de resultados
            resultsDiv.innerHTML = `<p style="color: #ffcccc;">Error: ${error.message}</p><p>Por favor, verifica tu clave API y el tema ingresado. Consulta la consola del navegador (F12) para más detalles.</p>`;
        } finally {
            // Este bloque se ejecuta siempre, tanto si la operación fue exitosa como si falló.
            // Vuelve a habilitar el botón
            generateBtn.disabled = false;
            // Elimina la clase CSS de carga del botón
            generateBtn.classList.remove('loading');
        }
    });
});
