# Maze Navigation Web Game

This web game recreates the maze navigation experiment used to evaluate Large Language Models' spatial reasoning abilities.

## How to Play

1. Open `index.html` in a web browser
2. Click "Start Challenge" to begin
3. Navigate using arrow keys or WASD
4. Reach the red goal from the green starting position
5. You can only see how far you can travel in each direction (gray cells)
6. Visited cells turn white and show visit count
7. Avoid visiting the same cell 10 times or exceeding the move limit

## Files

- `index.html` - Main game interface
- `game.js` - Game logic and rendering
- `maze_data.js` - Pre-generated maze data from the experiments
- `extract_mazes.py` - Script to extract maze data from evaluation results

## Features

- 55 pre-generated mazes (5 each for sizes 5×5 to 15×15)
- Limited visibility matching the LLM experiment conditions
- Move and visit tracking
- Procedural maze generation for sizes beyond 15×15
- Full maze reveal after completion/failure

## Running the Game

Simply open `index.html` in any modern web browser. No server required - it's a static page.

## Regenerating Maze Data

If you need to regenerate the maze data:

```bash
python extract_mazes.py
```

This will read mazes from `../model_evaluation_results_english/mazes/` and create `maze_data.js`.