
function openPage(element, page){
	while(element != window.body && !(element instanceof IOSTab))
		element = element.parentElement;
	
	if(element instanceof IOSTab)
		element.showNewPage(page);
}

function openTab(element, tabId){
	while(element != window.body && !(element instanceof IOSApp))
		element = element.parentElement;
	
	if(element instanceof IOSApp)
		element.selectTab(tabId);
}

function loadSVG(src, callback){
	if(src.trim().startsWith("<svg"))
		return callback(src);
	fetch(src).then(c => c.text()).then(callback);
}

function createSVGElement(src){
	var svgElement = document.createElement('template');
	svgElement.innerHTML = src.trim();
	return svgElement.content.firstChild;
}

function mirrorEvents(source, target, eventNames){
	eventNames.forEach(eventName => {
		source.addEventListener(eventName, e => target.dispatchEvent(new e.constructor(e.type, e)));
	});
}

let ignoreTimeStamp = 0;
function addPointerListener(element, type, callback){
	let names = 0;
	if(type == "up")
		names = [element, "mouseup", element, "touchend"];
	if(type == "move")
		names = [window, "mousemove", element, "touchmove"];
	if(type == "down")
		names = [element, "mousedown", element, "touchstart"];
	
	names[0].addEventListener(names[1], e => {
		if(e.timeStamp != ignoreTimeStamp) callback({
			clientX: e.clientX, 
			clientY: e.clientY, 
			pointerId: 0, 
			preventDefault: function() { e.preventDefault() }
		})
	});
	names[2].addEventListener(names[3], e => {
		ignoreTimeStamp = e.timeStamp;
		const touch = e.changedTouches[0];
		callback({
			clientX: touch.clientX, 
			clientY: touch.clientY, 
			pointerId: touch.identifier, 
			preventDefault: function() { e.preventDefault() }
		});
	});
}

class IOSElement extends HTMLElement {

	_watchChildren(callback){
		new MutationObserver(e => e.forEach(r => r.addedNodes.forEach(callback)))
			.observe(this, {childList: true});
		[...this.children].forEach(callback);
	}

	_watchAttribute(callback, attributeName, defaultValue = undefined){
		let oldValue = this.hasAttribute(attributeName) ? this.getAttribute(attributeName) : defaultValue;
		callback(oldValue);
		new MutationObserver(e => {
			let newValue = this.hasAttribute(attributeName) ? this.getAttribute(attributeName) : defaultValue;
			if(newValue !== oldValue)
				callback(newValue);
			oldValue = newValue
		}).observe(this, {attributes: true, attributeFilter: [attributeName]});
	}
}

/*
	Events:
		- theme-changed
		- transition-started
		- transition-completed
		- transition
		- tab-created
		- tab-selected
		- tab-deselected
		- page-created
		- page-selected
		- page-deselected
*/
class IOSApp extends IOSElement {

	static _cssCallbacks = [];
	static notifyCSS(){
		const realCSS = [...document.styleSheets].find(style => 
			[...style.cssRules].find(rule => rule.cssText.includes("i-app-detection-label"))
		);
		if(document.adoptedStyleSheets){
			IOSApp.css = new CSSStyleSheet();
			IOSApp.css.replace([...realCSS.cssRules].map(rule => rule.cssText).join("\n"));
		}else 
			IOSApp.css = [...realCSS.cssRules].map(rule => rule.cssText).join("\n");

		const callbacks = IOSApp._cssCallbacks;
		IOSApp._cssCallbacks = undefined;
		callbacks.forEach(a => a())
	}

	static loadStyleSheet(callback){
		if(IOSApp._cssCallbacks) IOSApp._cssCallbacks.push(callback);
		else callback();
	}

	static addStyleToShadow(shadow){
		if(document.adoptedStyleSheets){
			const newStyleSheets = [IOSApp.css];
			for (let i = 0; i < shadow.adoptedStyleSheets.length; i++)
				newStyleSheets.push(shadow.adoptedStyleSheets[i]);
			shadow.adoptedStyleSheets = newStyleSheets;
		}else
			shadow.innerHTML += `<style>${IOSApp.css}</style>`;
	}

	connectedCallback() {
		if(!this.initialized) this.initialized = true;
		else return;

		IOSApp.loadStyleSheet(() => {
			this.classList.add("i-root");

			// Color scheme changing
			this._colorChangingElements = [];
			this._bindThemeChangingElement(this);
			["dark", "light"].forEach(theme => 
				window.matchMedia(`(prefers-color-scheme: ${theme})`).addEventListener("change", e => {
					if(e.matches && (this.getAttribute("theme") || "auto") == "auto"){
						this._theme = `i-theme-${theme}`;
						this._recalcTheme();
					}
				})
			);
			this._watchAttribute(value => {
				if(value == "auto")
					this._theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? "i-theme-dark" : "i-theme-light";
				else this._theme = `i-theme-${value}`;
				this._recalcTheme();
			}, "theme", "auto");

			// Attaching shadow with tabbar
			this.attachShadow({mode: 'open'});
			IOSApp.addStyleToShadow(this.shadowRoot);
			this.shadowRoot.innerHTML += `
				<i-tabbar></i-tabbar>
				<slot></slot>
			`;
			this.bottomMenu = this.shadowRoot.querySelector("i-tabbar");
			this.bottomMenu.bindApp(this);

			// Risize listener to check if in IPad mode
			new ResizeObserver(e => {
				const rect = this.getBoundingClientRect();
				this.classList.toggle("large-screen", e[0].contentRect.width >= 600)
			}).observe(this);

			// Children listener to proper add tabs
			this._watchChildren(element => {
				if(element instanceof IOSTab)
					this._processBindTab(element);
			}, true);

			if(this.hasAttribute("manifest"))
				this._loadFromManifest();
		});
	}

	_recalcTheme(){
		this._colorChangingElements.forEach(element => {
			[...element.classList]
				.filter(c => c.startsWith("i-theme"))
				.forEach(c => element.classList.remove(c));
			element.classList.add(this._theme);
		});
	}

	_bindThemeChangingElement(element){
		this._colorChangingElements.push(element);
		this._recalcTheme();
	}

	_processBindTab(tab){
		tab._bindApp(this);
		if(tab.hasAttribute("selected") || this.tabsCount == 1)
			this.selectTab(tab.id);
	}

	_loadFromManifest(){
		fetch(this.getAttribute("manifest")).then(d => d.json())
		.then(appManifest => {
			appManifest.tabs.forEach(tabManifest => {
				var tab = document.createElement("i-tab");
				if(tabManifest.selected) tab.setAttribute("selected", "");
				if(tabManifest.id) tab.setAttribute("id", tabManifest.id);
				if(tabManifest.name) tab.setAttribute("name", tabManifest.name);
				if(tabManifest.page) tab.setAttribute("page", tabManifest.page);
				if(tabManifest.icon) tab.setAttribute("icon", tabManifest.icon);
				this.appendChild(tab);
			});
		});
	}

	selectTab(tabId){
		var tab = this.querySelector(`#${tabId}`);

		this.selectedTab?.deselected();
		this.selectedTab = tab;
		tab.selected();
	}

	_animateTransition(page, duration, transform = percent => percent) {
		let animationId = new IOSAnimationId();
		var easing = bezier(0.2, 0.8, 0.2, 1);
		var start = Date.now();
		var that = this;
		this._transitionStarted(animationId, page);
		(function loop () {
			var p = (Date.now()-start)/duration;
			if (p >= 1){
				that._processTransitionFrame(page, transform(1));
				that._transitionCompleted(animationId, page, transform(1) == 1);
			}else {
				that._processTransitionFrame(animationId, page, transform(easing(p)));
				requestAnimationFrame(loop);
			}
		}());
	}

	_transitionStarted(animationId, page){
		this._animationId = animationId;
		this.dispatchEvent(new CustomEvent("transition-started", { detail: { page: page } }));
	}

	_transitionCompleted(animationId, page, isEnd){
		if(this._animationId != animationId)
			return;
		this.dispatchEvent(new CustomEvent("transition-completed", { detail: { page: page, isEnd: isEnd } }));
	}

	_processTransitionFrame(animationId, page, percent){
		if(this._animationId != animationId)
			return;
		page.style.transform = `translateX(${(1-percent) * 100}%)`;
		page.prevPage.style.transform = `translateX(${percent * -30}%)`;

		this.dispatchEvent(new CustomEvent("transition", { detail: { page: page, percent: percent } }));
	}
}

class IOSAnimationId {}


window.customElements.define('i-app', IOSApp);