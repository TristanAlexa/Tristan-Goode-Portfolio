/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Chat } from "@google/genai";

// Intersection Observer for section animations
const sections = document.querySelectorAll('.hidden-section');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show-section');
        } else {
            entry.target.classList.remove('show-section');
        }
    });
}, {
    threshold: 0.15, // Trigger when 15% of the element is visible
});

sections.forEach(section => {
    observer.observe(section);
});

// AI Chat Assistant Handler
const chatContainer = document.getElementById('contact');
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const chatMessages = document.getElementById('chat-messages') as HTMLDivElement;
const chatLoading = document.getElementById('chat-loading') as HTMLDivElement;

let chat: Chat | null = null;

const SYSTEM_INSTRUCTION = `You are a friendly and professional contact assistant for Tristan Goode's portfolio.
Tristan is a woman; please use she/her pronouns when referring to her.
Your goal is to collect the user's name, email address, and a message they want to send to Tristan.
Be conversational and guide the user through the process one step at a time.
Start by introducing yourself and asking for their name.
IMPORTANT: Do not answer any questions about Tristan's skills, experience, or personal details. If a user asks such a question, you must politely decline and state that your only purpose is to help them send a message. Then, gently guide the conversation back to collecting their information.
Once you have collected all three pieces of information (name, email, and message), you MUST respond ONLY with a JSON object in this exact format:
{"readyToSend": true, "name": "[user's name]", "email": "[user's email]", "message": "[user's message]"}.
Do not add any other text or markdown formatting around the JSON.`;

async function initializeChat() {
    try {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY is not set in environment variables.");
        }
        addMessage('ai', 'Hello! I\'m Tristan\'s AI assistant. I can help you get in touch with her. What\'s your name?');
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
            }
        });
    } catch (error) {
        console.error("Failed to initialize AI Chat:", error);
        addMessage('ai', 'Sorry, I\'m having trouble connecting right now. Please try again later or use the direct contact info.');
        if (chatInput) chatInput.disabled = true;
    }
}

function addMessage(sender: 'user' | 'ai', text: string) {
    if (!chatMessages) return;
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleMailToAction(details: { name: string; email: string; message: string; }) {
    const { name, email, message } = details;
    const myEmail = 'tristan.goode@example.com';
    const subject = '!TG - Portfolio Inquiry!';
    
    let body = `Message from: ${name}\n`;
    body += `Email: ${email}\n`;
    body += `\n---\n\n${message}`;

    const mailtoLink = `mailto:${myEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;

    setTimeout(() => {
        addMessage('ai', 'Great! I\'ve opened your email client with all the details. I\'ll be here if you need anything else. Thanks for reaching out!');
        if (chatInput) chatInput.disabled = true;
    }, 1000);
}

if (chatForm && chatInput && chatMessages && chatLoading && chatContainer) {
    // Initialize chat when the contact section becomes visible
    const chatObserver = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting && !chat) {
            await initializeChat();
            chatObserver.unobserve(chatContainer); // Stop observing once initialized
        }
    }, { threshold: 0.15 });

    chatObserver.observe(chatContainer);

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage || !chat) return;

        addMessage('user', userMessage);
        chatInput.value = '';
        chatLoading.style.display = 'block';
        chatInput.disabled = true;

        try {
            const responseStream = await chat.sendMessageStream({ message: userMessage });
            
            let fullResponse = '';
            const aiMessageElement = document.createElement('div');
            aiMessageElement.classList.add('chat-message', 'ai-message');
            chatMessages.appendChild(aiMessageElement);

            for await (const chunk of responseStream) {
                fullResponse += chunk.text;
                aiMessageElement.textContent = fullResponse;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            // Check if the final response is the JSON object
            try {
                const jsonResponse = JSON.parse(fullResponse);
                if (jsonResponse.readyToSend) {
                    // Update the last message to be user-friendly instead of showing JSON
                    aiMessageElement.textContent = 'Great, I have all the details. I\'ll prepare the email for you now!';
                    handleMailToAction(jsonResponse);
                    return; // Stop further processing
                }
            } catch (jsonError) {
                // Not a JSON response, which is normal for conversational turns
            }

        } catch (error) {
            console.error("Error sending message:", error);
            addMessage('ai', 'I seem to be having some trouble. Could you try sending that again?');
        } finally {
            chatLoading.style.display = 'none';
            chatInput.disabled = false;
            chatInput.focus();
        }
    });
}