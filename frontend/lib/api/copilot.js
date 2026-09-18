import apiClient from './client';

export async function askCopilot(message, history = []) {
	return apiClient.post('/copilot/chat', { message, history });
}
