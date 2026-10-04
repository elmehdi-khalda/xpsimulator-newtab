var player = document.querySelector('#movie_player');
var width = document.body.getAttribute('redux-player-width');
var height = document.body.getAttribute('redux-player-height');
if (player && typeof player.setInternalSize === 'function' && width && height) {
	try {
		player.setInternalSize(Number(width), Number(height));
	} catch (e) {}
}