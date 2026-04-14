<script>
	import { onMount } from 'svelte';
	import { validateSencode } from '@sudoku/sencode';
	import game from '@sudoku/game';
	import { modal } from '@sudoku/stores/modal';
	import { gameWon } from '@sudoku/stores/game';
	import Board from './components/Board/index.svelte';
	import Controls from './components/Controls/index.svelte';
	import Header from './components/Header/index.svelte';
	import Modal from './components/Modal/index.svelte';

	gameWon.subscribe(won => {
		if (won) {
			game.pause();
			modal.show('gameover');
		}
	});

	onMount(() => {
		let hash = location.hash;

		if (hash.startsWith('#')) {
			hash = hash.slice(1);
		}

		let sencode;
		if (validateSencode(hash)) {
			sencode = hash;
		}

		modal.show('welcome', { onHide: game.resume, sencode });
	});
</script>

<!-- Timer, Menu, etc. -->
<header>
	<Header />
</header>

<!-- Sudoku Field -->
<section>
	<Board />
</section>

<!-- Keyboard -->
<footer>
	<Controls />
</footer>

<Modal />

<style global>
	@tailwind base;
	@tailwind components;

	body {
		background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3e%3cpath fill='%232979fa' fill-opacity='1' d='M0,160L48,154.7C96,149,192,139,288,144C384,149,480,171,576,165.3C672,160,768,128,864,133.3C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z'%3e%3c/path%3e%3c/svg%3e");
		@apply bg-cover bg-no-repeat bg-gray-custom antialiased text-gray-900;
	}

	#app {
		@apply flex flex-col min-h-screen;
	}

	#app > header {
		@apply flex-grow;
	}

	#app > footer {
		@apply flex flex-grow flex-col justify-end;
	}

	.btn {
		@apply flex justify-center items-center bg-gray-custom px-5 py-3 border-2 rounded-xl transition-colors duration-100 text-2xl tracking-wide leading-none font-semibold;
	}

	.btn:hover {
		@apply bg-gray-200;
	}

	.btn:active {
		@apply bg-gray-300;
	}

	.btn:focus {
		@apply outline-none shadow-outline;
	}

	.btn:disabled {
		@apply text-gray-500 bg-gray-300 border-gray-300 pointer-events-none cursor-default;
	}

	.btn-round {
		@apply rounded-full p-3;
	}

	.btn-small {
		@apply px-5 py-3 text-lg;
	}

	.btn-primary {
		@apply border-transparent text-white bg-primary;
	}

	.btn-primary:hover {
		@apply bg-primary-dark;
	}

	.btn-primary:active {
		@apply bg-primary-darker;
	}

	.icon-outline {
		@apply h-6 inline;
	}

	.icon-solid {
		@apply h-5 inline;
	}

	.input {
		@apply p-3 rounded-xl bg-gray-300 text-2xl text-gray-700;
	}

	.input:focus {
		@apply outline-none shadow-outline;
	}

	@tailwind utilities;
</style>
