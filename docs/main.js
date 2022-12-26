function insertAtCursor(textarea, text) {
	textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
}

function countWords(words) {
	const ignored = ['', '-', '–', '—'];
	return words.trim().replaceAll('\n', ' ').split(' ').filter(c => !ignored.includes(c)).length;
}
function countChars(words) {
	return words.trim().replaceAll('\r', '').length;
}
class WordCounter {
	constructor(maxWords=0, maxChars=0) {
		if (maxWords && maxChars) throw Error('Cannot set maxWords and maxChars simultaneously');

		this._wordCount = 0;
		this._maxWords = maxWords;
		this.wordCountElem = document.getElementById('stats-words');

		this._charCount = 0;
		this._maxChars = maxChars;
		this.charCountElem = document.getElementById('stats-chars');

		this.completionElem = document.getElementById('stats-completion');
	}

	set wordCount(wordCount) {
		this._wordCount = wordCount
		this.wordCountElem.innerText = this._wordCount.toLocaleString();
		this.updateCompletion();
	}
	get wordCount() {
		return this._wordCount;
	}
	addWords(delta) {
		console.log(delta)
		this.wordCount = this.wordCount + delta;
	}

	set charCount(charCount) {
		this._charCount = charCount;
		this.charCountElem.innerText = this._charCount.toLocaleString();
		this.updateCompletion();
	}
	get charCount() {
		return this._charCount;
	}
	addChars(delta) {
		this.charCount = this.charCount + delta;
	}

	set maxWords(maxWords) {
		this._maxWords = parseInt(maxWords);
		this.updateCompletion();
	}
	get maxWords() {
		return this._maxWords;
	}
	set maxChars(maxChars) {
		this._maxChars = parseInt(maxChars);
		this.updateCompletion();
	}
	get maxChars() {
		return this._maxChars;
	}

	update(words) {
		this.wordCount = countWords(words);
		this.charCount = countChars(words);
	}
	updateCompletion() {
		let percentage;
		if (this.maxWords) percentage = Math.ceil(this.wordCount / this.maxWords * 100);
		else if (this.maxChars) percentage = Math.ceil(this.charCount / this.maxChars * 100);
		else percentage = '';
		this.completionElem.innerText = percentage;
		this.completionElem.classList[percentage > 100 ? 'add' : 'remove']('warning');
	}
}

class Settings {
	constructor(counter) {
		this.counter = counter
		this.settings = localStorage.settings ? JSON.parse(localStorage.settings) : {
			limitType: 'none',
			limitValue: 0
		};
		this.elements = {
			limitType: document.getElementById('settings-limit-type'),
			limitValue: document.getElementById('settings-limit-value')
		}
		this.form = document.getElementById('settings');
	}

	load() {
		for (const [k, v] of Object.entries(this.settings))
			this.elements[k].value = v;
		this.set();
	}

	save() {
		for (const [k, v] of Object.entries(this.elements))
			this.settings[k] = v.value;
		localStorage.settings = JSON.stringify(this.settings);
		this.set();
		this.toggle();
	}

	set() {
		this.counter.maxWords = this.settings.limitType == 'word' ? this.settings.limitValue : 0;
		this.counter.maxChars = this.settings.limitType == 'char' ? this.settings.limitValue : 0;
	}

	toggle() {
		this.form.classList.toggle('open');
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const textarea = document.getElementById('input');
	const counter = new WordCounter;
	const settings = new Settings(counter);
	let idleTimeout, counterInterval;

	function save() {
		counter.update(textarea.value);
		localStorage.text = textarea.value;
	}

	textarea.addEventListener('keydown', async e => {
		if (e.key == 'Tab') {
			e.preventDefault();
			insertAtCursor(textarea, '\t');
		}
	});

	textarea.addEventListener('selectionchange', async () => {
		if (textarea.selectionStart != textarea.selectionEnd) {
			const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
			if (countWords(selection)) counter.update(selection);
			return;
		}
		if (idleTimeout) clearTimeout(idleTimeout);
		idleTimeout = setTimeout(save, 500);
		if (counter.charCount < 50000) {
			counter.update(textarea.value);
			if (counterInterval) clearInterval(counterInterval);
		}
		else if (!counterInterval) counterInterval = setInterval(() => counter.update(textarea.value), 1000);
	});

	if (localStorage.text) textarea.value = localStorage.text;
	counter.update(textarea.value);

	settings.load();
	document.getElementById('stats-settings').addEventListener('click', () => settings.toggle());
	document.getElementById('settings-overlay').addEventListener('click', () => settings.toggle());
	document.getElementById('settings-save').addEventListener('click', () => settings.save());
});