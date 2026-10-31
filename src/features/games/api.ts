import type { Stroke } from '@/lib/drawing';
import {
  parseDrawing,
  parseGameOverview,
  parseGameRound,
  parseGuessResult,
  type Drawing,
  type GameId,
  type GameOverview,
  type GameRound,
  type GuessResult,
} from '@/lib/games';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

// Rondas ---------------------------------------------------------------------

export async function fetchGameOverview(): Promise<GameOverview> {
  const { data, error } = await supabase.rpc('get_game_overview');
  if (error) throw error;
  return parseGameOverview(data);
}

export async function fetchGameRound(roundId: string): Promise<GameRound> {
  const { data, error } = await supabase.rpc('get_game_round', { p_round_id: roundId });
  if (error) throw error;
  return parseGameRound(data);
}

/** Si ya hay una ronda abierta de ese juego, devuelve esa. */
export async function startGameRound(game: GameId, spicy: boolean): Promise<GameRound> {
  const { data, error } = await supabase.rpc('start_game_round', {
    p_game: game,
    p_spicy: spicy,
  });
  if (error) throw error;
  return parseGameRound(data);
}

export async function answerGameItem(input: {
  roundId: string;
  questionId: string;
  choice: number;
}): Promise<GameRound> {
  const { data, error } = await supabase.rpc('answer_game_item', {
    p_round_id: input.roundId,
    p_question_id: input.questionId,
    p_choice: input.choice,
  });
  if (error) throw error;
  return parseGameRound(data);
}

export async function deleteGameRound(roundId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_game_round', { p_round_id: roundId });
  if (error) throw error;
}

// Reto de dibujo -------------------------------------------------------------

export async function fetchDrawing(id: string): Promise<Drawing> {
  const { data, error } = await supabase.rpc('get_drawing', { p_id: id });
  if (error) throw error;
  return parseDrawing(data);
}

/** Si ya tengo un reto mío en curso, devuelve ese. */
export async function startDrawing(): Promise<Drawing> {
  const { data, error } = await supabase.rpc('start_drawing');
  if (error) throw error;
  return parseDrawing(data);
}

export async function rerollDrawingWord(id: string): Promise<Drawing> {
  const { data, error } = await supabase.rpc('reroll_drawing_word', { p_id: id });
  if (error) throw error;
  return parseDrawing(data);
}

export async function submitDrawing(id: string, strokes: Stroke[]): Promise<Drawing> {
  const { data, error } = await supabase.rpc('submit_drawing', {
    p_id: id,
    p_strokes: strokes as unknown as Json,
  });
  if (error) throw error;
  return parseDrawing(data);
}

export async function guessDrawing(id: string, guess: string): Promise<GuessResult> {
  const { data, error } = await supabase.rpc('guess_drawing', { p_id: id, p_guess: guess });
  if (error) throw error;
  return parseGuessResult(data);
}

export async function giveUpDrawing(id: string): Promise<Drawing> {
  const { data, error } = await supabase.rpc('give_up_drawing', { p_id: id });
  if (error) throw error;
  return parseDrawing(data);
}

export async function deleteDrawing(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_drawing', { p_id: id });
  if (error) throw error;
}
