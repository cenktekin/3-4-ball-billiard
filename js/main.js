(() => {
  let canvas;
  let gameState;

  function init() {
    canvas = document.getElementById('gameCanvas');
    gameState = new GameState.GameState();

    Renderer.init(canvas);
    Input.init(canvas, gameState);
    GameFlow.init(gameState);

    requestAnimationFrame(gameLoop);
  }

  function gameLoop(timestamp) {
    GameFlow.update(timestamp);
    Renderer.render(
      gameState,
      GameFlow.getScreenShake(),
      GameFlow.getImpactFlash(),
      GameFlow.getMessageText(),
      GameFlow.getMessageTimer(),
      GameFlow.getIsReplaying(),
      GameFlow.getReplayTrajectories(),
      GameFlow.getSimSpeed(),
      GameFlow.isChallengeMode(),
      GameFlow.getChallengeResultTimer()
    );
    requestAnimationFrame(gameLoop);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
