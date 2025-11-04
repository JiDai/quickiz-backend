export interface QuestionRequest {
	id?: string;
	title: string;
	answer1: string;
	answer2: string;
	answer3: string;
	answer4: string;
	goodAnswer: string;
	quizId: string;
}

export interface QuizRequest {
	id?: string;
	title: string;
	description: string;
}
