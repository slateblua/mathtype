import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	Plugin,
	MarkdownRenderer,
	PluginSettingTab,
	Setting
} from 'obsidian';

interface MathTypePrefs {
	customMappings: { [key: string]: string };
	startKey: string
}

const DEFUALT_PREFS: MathTypePrefs = {
	customMappings: {
		// Basic Operations
		'fraction': '\\frac{numerator}{denominator}',
		'sum': '\\sum_{i=1}^{n}',
		'product': '\\prod_{i=1}^{n}',
		'integral': '\\int_{a}^{b}',
		'double integral': '\\iint_{D}',
		'triple integral': '\\iiint_{V}',
		'contour integral': '\\oint_{C}',
		
		// Roots and Powers
		'square root': '\\sqrt{x}',
		'nth root': '\\sqrt[n]{x}',
		'power': 'x^{n}',
		'subscript': 'x_{i}',

		// Limits and Infinity
		'infinity': '\\infty',
		'limit': '\\lim_{x \\to \\infty}',
		'limit to zero': '\\lim_{x \\to 0}',
		'limit from above': '\\lim_{x \\to a^+}',
		'limit from below': '\\lim_{x \\to a^-}',

		// Matrices and Arrays
		'matrix': '\\begin{matrix} a & b \\\\ c & d \\end{matrix}',
		'pmatrix': '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
		'bmatrix': '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
		'vmatrix': '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',

		// Greek Letters
		'alpha': '\\alpha',
		'beta': '\\beta',
		'gamma': '\\gamma',
		'delta': '\\Delta',
		'theta': '\\theta',
		'pi': '\\pi',
		'sigma': '\\sigma',
		'omega': '\\omega',

		// Operators and Relations
		'plus minus': '\\pm',
		'minus plus': '\\mp',
		'times': '\\times',
		'div': '\\div',
		'not equals': '\\neq',
		'approximately': '\\approx',
		'less or equal': '\\leq',
		'greater or equal': '\\geq',

		// Sets and Set Operations
		'intersection': '\\cap',
		'union': '\\cup',
		'big intersection': '\\bigcap_{i=1}^n',
		'big union': '\\bigcup_{i=1}^n',
		'subset': '\\subset',
		'proper subset': '\\subsetneq',
		'superset': '\\supset',
		'proper superset': '\\supsetneq',
		'not subset': '\\not\\subset',
		'element of': '\\in',
		'not element of': '\\notin',
		'empty set': '\\emptyset',
		'null set': '\\varnothing',
		'set minus': '\\setminus',
		'power set': '\\mathcal{P}',
		'natural numbers': '\\mathbb{N}',
		'integers': '\\mathbb{Z}',
		'rational numbers': '\\mathbb{Q}',
		'real numbers': '\\mathbb{R}',
		'complex numbers': '\\mathbb{C}',
		'set brackets': '\\{x : x > 0\\}',
		'cartesian product': '\\times',
		'therefore': '\\therefore',
		'because': '\\because',

		// Calculus and Functions
		'partial': '\\partial',
		'nabla': '\\nabla',
		'derivative': '\\frac{d}{dx}',
		'partial derivative': '\\frac{\\partial}{\\partial x}',
		'sine': '\\sin',
		'cosine': '\\cos',
		'tangent': '\\tan',

		// Arrows and Accents
		'rightarrow': '\\rightarrow',
		'leftarrow': '\\leftarrow',
		'leftrightarrow': '\\leftrightarrow',
		'Rightarrow': '\\Rightarrow',
		'Leftarrow': '\\Leftarrow',
		'hat': '\\hat{x}',
		'bar': '\\bar{x}',
		'vec': '\\vec{x}',

		// Spacing and Alignment
		'quad space': '\\quad',
		'text': '\\text{text here}',
		'newline': '\\\\',
		'horizontal space': '\\hspace{1cm}',
		'vertical space': '\\vspace{1cm}',

		// Probability and Statistics
		'probability': '\\mathbb{P}(A)',
		'conditional probability': '\\mathbb{P}(A|B)',
		'expected value': '\\mathbb{E}[X]',
		'variance': '\\text{Var}(X)',
		'standard deviation': '\\sigma',
		'normal distribution': '\\mathcal{N}(\\mu,\\sigma^2)',
		'binomial distribution': '\\text{Bin}(n,p)',
		'random variable': '\\mathcal{X}',
		'independent': '\\perp',
		'correlation': '\\rho',
		'covariance': '\\text{Cov}(X,Y)',
		'combination': '\\binom{n}{k}',
		'permutation': 'P(n,k)',
		'sample space': '\\Omega',
		'independence': '\\perp\\!\\!\\perp',
		'proportional to': '\\propto',
		'chi-squared': '\\chi^2',
		'beta distribution': '\\text{Beta}(\\alpha,\\beta)',
		'gamma distribution': '\\text{Gamma}(k,\\theta)',
		'poisson distribution': '\\text{Pois}(\\lambda)',
		'uniform distribution': '\\text{Unif}(a,b)',
		'exponential distribution': '\\text{Exp}(\\lambda)',

		// Logic Symbols
		'logical and': '\\land',
		'logical or': '\\lor',
		'logical not': '\\neg',
		'implies': '\\implies',
		'if and only if': '\\iff',
		'forall': '\\forall',
		'exists': '\\exists',
		'not exists': '\\nexists',
		'models': '\\models',
		'proves': '\\vdash',
		'contradiction': '\\bot',
		'tautology': '\\top'
	},
	startKey: "^"
}

export default class MathType extends Plugin {
	settings: MathTypePrefs;

	async onload() {
		await this.loadSettings();

		// Register the suggester
		this.registerEditorSuggest(new MathTypeSuggest(this));

		// Add settings tab
		this.addSettingTab(new PrefsTab(this.app, this));
	}

	getWordUnderCursor(line: string, cursorPos: number): string {
		const words = line.slice(0, cursorPos).split(' ');
		return words[words.length - 1].toLowerCase();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFUALT_PREFS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Suggest dropdown
class MathTypeSuggest extends EditorSuggest<string> {
	plugin: MathType;

	constructor(plugin: MathType) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const word = this.plugin.getWordUnderCursor(line, cursor.ch);


		if (!word.startsWith((this.plugin.settings.startKey))) return null;

		const lookup = word.substring(1)

		// Check if the word matches any of our mappings
		const hasMatch = Object.keys(this.plugin.settings.customMappings)
			.some(key => key.includes(lookup) && lookup.length >= 2); // Only trigger for 2+ characters

		if (hasMatch) {
			return {
				start: {
					line: cursor.line,
					ch: cursor.ch - word.length
				},
				end: cursor,
				query: lookup
			};
		}
		return null;
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		const word = this.plugin.getWordUnderCursor(context.query, context.query.length);
		return Object.entries(this.plugin.settings.customMappings)
			.filter(([key]) => key.includes(word))
			.map(([_, value]) => value);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
        const suggestionEl = el.createDiv({ cls: "suggestion-item" });

        // Container for rendered MathJax output
        const renderedEl = suggestionEl.createDiv({ cls: "suggestion-rendered" });

        MarkdownRenderer.render(
			this.app,
            `$$${value}$$`,
            renderedEl,
            '',
			this.plugin,
        );
    }

	selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
		if (!this.context) return;

		const editor = this.context.editor;
		const lineContent = editor.getLine(this.context.start.line);

		if (!lineContent.startsWith("$") && !lineContent.endsWith("$")) {
			editor.replaceRange(
				`$${value}$`,
				this.context.start,
				this.context.end
			);
		} else {
			editor.replaceRange(
				value,
				this.context.start,
				this.context.end
			);
		}
	}
}

// Prefs tab
class PrefsTab extends PluginSettingTab {
	plugin: MathType;

	constructor(app: App, plugin: MathType) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'MathType Suggester Prefs'});

		new Setting(containerEl)
			.setName('Start Key')
			.setDesc('Set the key to trigger MathType suggestions.')
			.addText(text => text
				.setValue(this.plugin.settings.startKey || '')
				.onChange(async (newValue) => {
					this.plugin.settings.startKey = newValue;
					await this.plugin.saveSettings();
				}));

	}
}
