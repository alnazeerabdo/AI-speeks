document.addEventListener('DOMContentLoaded', () => {
    const micButton = document.getElementById('micButton');
    const micIcon = document.getElementById('micIcon');
    const statusText = document.getElementById('statusText');
    const transcriptOutput = document.getElementById('transcriptOutput');
    const copyButton = document.getElementById('copyButton');
    const clearButton = document.getElementById('clearButton');
    const micWrapper = document.querySelector('.mic-wrapper');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const modelSelect = document.getElementById('modelSelect');

    // Configuration
    const API_KEY = "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";
    const API_URL = "https://openrouter.ai/api/v1/audio/transcriptions";

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // Check for MediaRecorder support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("عذراً، متصفحك لا يدعم تسجيل الصوت. يرجى استخدام متصفح حديث مثل Chrome أو Edge.");
        statusText.innerText = "المتصفح غير مدعوم";
        micButton.disabled = true;
        return;
    }

    // Start/Stop Recording Logic
    micButton.addEventListener('click', async () => {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    });

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // or 'audio/mp3' depending on browser support
                await sendToAPI(audioBlob);

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;

            // UI Updates
            micWrapper.classList.add('recording');
            statusText.innerText = "جاري الاستماع... (اضغط للإيقاف)";
            micIcon.setAttribute('data-lucide', 'square'); // Stop icon
            lucide.createIcons();

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("تعذر الوصول إلى الميكروفون. يرجى التحقق من الإعدادات.");
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            isRecording = false;

            // UI Updates
            micWrapper.classList.remove('recording');
            statusText.innerText = "اضغط للتحدث";
            micIcon.setAttribute('data-lucide', 'mic');
            lucide.createIcons();
        }
    }

    async function sendToAPI(audioBlob) {
        // Show Loading
        loadingSpinner.classList.remove('hidden');

        const formData = new FormData();
        // OpenRouter/OpenAI expects a file with a name
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', modelSelect.value || 'openai/whisper');
        // Optional: Add language if we want to force it, but auto-detect is usually better for mixed usage
        // formData.append('language', 'ar'); 

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    // Do NOT set Content-Type header manually when sending FormData, 
                    // the browser sets it with the boundary automatically.
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Append text or replace? Usually replace for a single recording session.
                // Let's append with a newline if there's existing text.
                const newText = data.text || "";
                if (transcriptOutput.value) {
                    transcriptOutput.value += "\n" + newText;
                } else {
                    transcriptOutput.value = newText;
                }
            } else {
                console.error("API Error:", data);
                alert(`حدث خطأ في المعالجة: ${data.error?.message || 'Unknown error'}`);
            }

        } catch (error) {
            console.error("Network Error:", error);
            alert("حدث خطأ في الاتصال بالخادم.");
        } finally {
            // Hide Loading
            loadingSpinner.classList.add('hidden');
        }
    }

    // Copy Functionality
    copyButton.addEventListener('click', () => {
        if (!transcriptOutput.value) return;

        navigator.clipboard.writeText(transcriptOutput.value).then(() => {
            const originalText = copyButton.innerHTML;
            copyButton.innerHTML = `<i data-lucide="check"></i> تم النسخ!`;
            lucide.createIcons();

            setTimeout(() => {
                copyButton.innerHTML = originalText;
                lucide.createIcons();
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });

    // Clear Functionality
    clearButton.addEventListener('click', () => {
        transcriptOutput.value = '';
    });
});
