// =====================================================
// MAIN - ECS PURO
// =====================================================

console.log('🚀 Iniciando juego ECS...');

try {
  const game = new GameEngineECS();
  window.game = game;
  console.log('✅ Complete!');
} catch (e) {
  console.error('❌ Error:', e);
  alert('Error: ' + e.message);
}
