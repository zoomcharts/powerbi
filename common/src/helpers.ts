module powerbi.extensibility.visual {
    export let isDebugVisual = /plugin=[^&]*_DEBUG&/.test(document.location.toString()) || (document.location.search || "").indexOf("unmin") > -1;

    try {
        Number(window.devicePixelRatio);
    } catch (e) {
        console.warn("Cannot read window.devicePixelRatio. Applying workaround. See https://github.com/Microsoft/PowerBI-visuals-tools/issues/81", e);

        let value = 1;
        if (window.window.devicePixelRatio) {
            value = window.window.devicePixelRatio;
        }
        Object.defineProperty(window, "devicePixelRatio", {
            get: () => value
        });
    }

    export function updateScale(options: VisualUpdateOptions, chart) {
        //scale:
        let tempViewport: any = options.viewport;
        let tmpScale = 0;
        let scale: any = null;
        if (tempViewport.scale) {
            tmpScale = tempViewport.scale;
            if (tmpScale == 1) {
                scale = true;
            } else if (tmpScale > 0 && tmpScale < 1) {
                scale = tmpScale * 2;
            } else if (tmpScale > 1) {
                if (window.devicePixelRatio) {
                    scale = tmpScale * window.devicePixelRatio;
                } else if (window.window.devicePixelRatio) {
                    scale = tmpScale * window.window.devicePixelRatio;
                } else {
                    scale = tmpScale * 1;
                }
            }
        }
        if (scale) {
            chart.replaceSettings({
                advanced: {
                    highDPI: scale
                }
            });
        }
        return scale;
    }

    export function updateSize(visual, viewport){
        let scale;
        if (typeof(viewport.scale) != "undefined"){
            scale = viewport.scale;
        } else {
            scale = this.current_scale;
        }

        if (!visual.prev_pixel_ratio){
            visual.prev_pixel_ratio = window.devicePixelRatio;
        }
        if (window.devicePixelRatio != visual.prev_pixel_ratio){
            visual.prev_pixel_ratio = window.devicePixelRatio;
            visual.current_scale = 1;
        }
        visual.prev_pixel_ratio = 2;
        if (scale){
            scale = visual.current_scale = scale;
        } else {
            scale = visual.current_scale;
        }
        if (window.devicePixelRatio == 2){
            if (scale > 1){
                scale = scale;// * window.devicePixelRatio;
                let height = viewport.height;
                let width = viewport.width;
                let nh:any;
                let nw:any;
                visual.target.style.height =(nh=Math.round(height * scale )) +"px";
                visual.target.style.width = (nw=Math.round(width * scale)) +"px";
                visual.target.style.marginTop = -Math.round((height - height * 1/scale)/2)*scale+"px";
                visual.target.style.marginLeft= -Math.round((width - width *1/scale)/2)*scale +"px"; 
                let t:any;
                visual.target.style.transform = t="scale(" + 1/scale + "," + 1/scale + ")";
            }
        } else {
            if (scale > 1){
                let height = viewport.height;
                let width = viewport.width;
                let nh:any;
                let nw:any;
                visual.target.style.height =(nh=Math.round(height * scale )) +"px";
                visual.target.style.width = (nw=Math.round(width * scale)) +"px";
                visual.target.style.marginTop = -Math.round((height - height * 1/scale)/2*scale)+"px";
                visual.target.style.marginLeft= -Math.round((width - width *1/scale)/2*scale)+"px"; 
                let t:any;
                visual.target.style.transform = t="scale(" + 1/scale + "," + 1/scale + ")";
            }
        }
    } 

    export function createDataSourceIdentity(dataView: DataView): string {
        if (!dataView || !dataView.metadata || !dataView.metadata.columns.length)
            return "";

        let res = "";

        for (let c of dataView.metadata.columns) {
            res += "//" + JSON.stringify(c.expr) + "/" + c.queryName + "/" + c.index;
            if (c.roles) {
                for (let k of Object.keys(c.roles)) {
                    if (c.roles[k])
                        res += "/" + k;
                }
            }
        }

        return res;
    }

    export function secureString(i: any) {
        if (!i) {
            return i;
        }
        if(typeof i !== "string") {
            return i;
        }
        let s: string = i.replace(/</g, "&lt;").replace(/>/, "&gt;");
        return s;
    }

    export function createColorPalette(host: IVisualHost) {
        let cp = host.colorPalette;

        if ((<any>extensibility).createColorPalette && (<any>cp).colors)
            cp = (<any>extensibility).createColorPalette((<any>cp).colors);

        return cp;
    }

    export function logExceptions(): MethodDecorator {
        return function (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<Function>)
            : TypedPropertyDescriptor<Function> {

            if (!isDebugVisual)
                return descriptor;

            return {
                value: function () {
                    try {
                        return descriptor.value.apply(this, arguments);
                    } catch (e) {
                        // alert() seems to be the only way to get something shown in PowerBI desktop
                        // alert(e.toString() + e.stack);
                        console.error(e);
                        throw e;
                    }
                }
            }
        }
    }

    export function hideMessage(target: HTMLElement) {
        if (!target)
            return;

        let container = <HTMLElement>target.getElementsByClassName("message-overlay")[0];
        if (container) {
            container.style.display = "none";
        }
    }

    export function displayMessage(target: HTMLElement, message: string, title: string, isError: boolean) {
        if (!target)
            return;

        let container = <HTMLElement>target.getElementsByClassName("message-overlay")[0];
        if (!container) {
            container = document.createElement("div");
            container.className = "message-overlay";
            target.appendChild(container);
        }

        container.style.display = "";

        let html = "";
        if (title) html += "<h3>" + title + "</h3>";
        if (message) html += "<p>" + message + "</p>";
        container.innerHTML = html;
    }

    export function arraysEqual<T>(a1: T[], a2: T[], equality: (a: T, b: T) => boolean = (a, b) => a === b) {
        if (a1 === a2) return true;
        if (!Array.isArray(a1) || !Array.isArray(a2)) return false;
        if (a1.length !== a2.length) return false;
        for (let i = 0; i < a1.length; i++) {
            if (!equality(a1[i], a2[i])) return false;
        }
        return true;
    }

    function getColorDirect(category: DataViewCategoryColumn, rowIndex: number, objectName: string): IColorInfo {
        if (!category.objects) return null;
        let a = category.objects[rowIndex];
        if (!a) return null;
        let b = a[objectName];
        if (!b) return null;
        let c = b["fill"];
        if (!c) return null;
        let d = c["solid"];
        if (!d) return null;
        return { value: d.color };
    }

    const cachedCategoryColors: ZoomCharts.Dictionary<{ color: IColorInfo, identity: string }> = {};

    export function getColor(category: DataViewCategoryColumn, rowIndex: number, objectName: string): IColorInfo {
        let color = getColorDirect(category, rowIndex, objectName);
        let foundRowIndex = rowIndex;

        const valueToSearch = category.values[rowIndex];
        if (!color && category.objects) {
            for (let i = 0; i < category.objects.length; i++) {
                if (i !== rowIndex && category.values[i] === valueToSearch) {
                    color = getColorDirect(category, i, objectName);

                    if (color) {
                        foundRowIndex = i;
                        break;
                    }
                }
            }
        }

        let localId = category.source.queryName + "\ufdd0" + valueToSearch + "\ufdd0" + objectName;
        if (!color) {
            let cached = cachedCategoryColors[localId];
            if (cached) {
                color = cached.color;
                for (let id of category.identity) {
                    if (id.key === cached.identity) {
                        // the color seems to be reset
                        color = null;
                        cachedCategoryColors[localId] = null;
                        break;
                    }
                }
            }
        } else {
            cachedCategoryColors[localId] = {
                color: color,
                identity: category.identity[foundRowIndex].key,
            };
        }

        return color;
    }

    export class ColorPaletteWrapper {
        private cache: ZoomCharts.Dictionary<IColorInfo> = Object.create(null);

        public constructor(private inner: IColorPalette) {
        }

        public getColor(key: string) {
            let c = this.cache[key];
            if (c) return c;

            return this.cache[key] = this.inner.getColor(key);
        }

        public setColor(key: string, value: IColorInfo) {
            this.cache[key] = value;
        }
    }

    export class betalimitator {
        /*
            Modes supported:
            
            BETA mode - possible to display BETA logo with toggle options where 
            overlay about where/how to post feedback. BETA logo is visible always.
            After time runs out, unable to interact with chart, overlay saying "time is out" appears.

            TRIAL mode - no logos appear by default. After time runs out, 
            an overlay about "This was a trial." appears.

        */
        public is_set: boolean = false;
        private when: number = null;
        public target: HTMLElement = null;
        protected logo: any = null;
        private boundingBox = null;
        public version = "BETA v.0.3";
        public visual: Visual = null;
        public host: IVisualHost;
        constructor(target, visual: Visual) {
            this.target = target;
            this.host = visual.host;
            //http://currentmillis.com/
            //You can set betalimitator globally for all PieData(PC/FC) and Data(TC) here:
            //this.set(1516053599000); //1510662480000
        }
        public set(when: number) { //milliseconds!
            this.is_set = true;
            this.when = when;
        }
        public addDays(days) {
            var dat = new Date();
            dat.setDate(dat.getDate() + days);
            return dat;
        }
        public checkIfExpired() {
            if (this.is_set) {
                if (this.when <= Date.now()) {
                    this.expired();
                    return true;
                }
            }
            return false;
        }
        public expired() {
            //  displayMessage(this.target, "Trial period for this visual is expired.", "Trial expired", false);
        }
        public showBetaLogo() {
            let self = this;
            let target = this.target;
            this.logo = document.createElement("div");
            let logo = this.logo;
            logo.className = "beta-logo";
            logo.style.transform = "scale(0.5,0.5)";
            logo.style.right = "-84px";
            logo.style.bottom = "-19px";
            logo.addEventListener("click", function () {
                let container = <HTMLElement>target.getElementsByClassName("message-overlay-bugreport")[0];
                if (container && container.style.display != "none") {
                    self.hideBugReportDialog();
                } else {
                    self.displayBugReportDialog();
                }
            });
            target.appendChild(logo);
        }
        public displayBetaExpiredMessage(target: HTMLElement, message: string, title: string, isError: boolean) {
            if (!target)
                return;

            let container = <HTMLElement>target.getElementsByClassName("message-overlay-beta")[0];
            if (!container) {
                container = document.createElement("div");
                container.className = "message-overlay-beta";
                target.appendChild(container);
            }

            container.style.display = "";

            let html = "";
            if (title) html += "<h3>" + title + "</h3>";
            if (message) html += "<p>" + message + "</p>";
            html += "<br><u class=\"action-btn-to-dashboard\">Go To ZoomCharts Dashboard</u><br>";
            html += "<br><div class=\"beta-version\">" + this.version + "</div>";
            container.innerHTML = html;

            let host = this.host;
            let url = "https://zoomcharts.com/en/account/dashboard/#power-bi-beta";
            let fn3 = function () {
                openURL(host, url);
            }
            let el = target.getElementsByClassName("action-btn-to-dashboard")[0];
            el.addEventListener("click", fn3);
        }
        public displayBugReportDialog() {
            let target = this.target;
            if (!target)
                return;

            let container = <HTMLElement>target.getElementsByClassName("message-overlay-bugreport")[0];
            if (!container) {
                let url = "https://zoomcharts.com/pbibeta/";
                container = document.createElement("div");
                container.className = "message-overlay-bugreport";
                target.appendChild(container);

                let title = "BUG?";
                let message = "Report on sight to us. Please use the link bellow or copy and paste the following address in to your browser:";
                message += "<br><br><b class=\"action-btn-link\">" + url + "</b>";
                container.style.display = "";

                let html = "";
                if (title) html += "<h3>" + title + "</h3>";
                if (message) html += "<p>" + message + "</p>";
                html += "<div class=\"beta-version\">" + this.version + "</div>";
                container.innerHTML = html;

                let host = this.host;
                let fn2 = function () {
                    openURL(host, url);
                }
                let el = target.getElementsByClassName("action-btn-link")[0];
                el.addEventListener("click", fn2);
            }
            container.style.display = "";
        }
        public hideBugReportDialog() {
            let target = this.target;
            let container = <HTMLElement>target.getElementsByClassName("message-overlay-bugreport")[0];
            if (!container) {
                return;
            }
            container.style.display = "none";
        }
    }

    export function getValue(objects: DataViewObjects, objectName: string, propertyName: string, defaultValue: null) {
        if (objects) {
            let object = objects[objectName];
            if (object) {
                let property = object[propertyName];
                if (property !== undefined) {
                    return property;
                }
            }
        }
        return defaultValue;
    }

    export class customiztionInformer {
        public target: HTMLElement = null;
        public initialCheck: boolean = false;
        public containerClass: string = "message-overlay-get-paid";
        public turnOffNextTime: boolean = false;
        public visual: Visual = null;
        public host: IVisualHost;
        public img_element: HTMLElement = null;
        public full_version_logo: HTMLElement = null;
        public enabled: boolean = true;
        public options: {
            url: "https://zoomcharts.com",
            images: {
                "600x400": "",
                "500x500": "",
                "400x600": "",
                "300x200": "",
                "200x300": ""
            }
        };
        constructor(target, visual: Visual, options?: any) {
            this.target = target;
            this.visual = visual;
            this.host = visual.host;
            this.options = options;
        }
        public disable() {
            this.enabled = false;
            let container = <HTMLElement>this.target.getElementsByClassName("get-paid-logo")[0];
            if(container) {
                container.parentNode.removeChild(container);
            }
            let container2 = <HTMLElement>this.target.getElementsByClassName(this.containerClass)[0];
            if(container2) {
                container2.parentNode.removeChild(container2);
            }
        }
        public displayDialog() {
            if(!this.enabled) {
                return;
            }
            this.initialCheckDone();
            let target = this.target;
            if (!target) {
                return;
            }

            let container = <HTMLElement>target.getElementsByClassName(this.containerClass)[0];
            if (!container) {
                container = document.createElement("div");
                container.className = this.containerClass;
                target.appendChild(container);

                container.style.display = "";

                let span = document.createElement("span");
                span.setAttribute("class", "helper");
                container.appendChild(span);

                //add image here:
                this.img_element = document.createElement("img");
                this.img_element.setAttribute("class", "action-btn");
                this.img_element.setAttribute("src", this.getDimensionImage());

                container.appendChild(this.img_element);

                let host = this.host;
                let url = this.options.url;
                let fn1 = function () {
                    openURL(host, url);
                }
                let el = target.getElementsByClassName("action-btn")[0];
                el.addEventListener("click", fn1);
            } else {
                this.updateImage();
            }

            container.style.display = "";
        }
        public hideDialog() {
            this.initialCheckDone();
            let container = <HTMLElement>this.target.getElementsByClassName(this.containerClass)[0];
            if (!container) {
                return;
            }

            container.style.display = "none";
        }
        public hideDialogAndTurnOff() {
            this.setToTurnOff();
            this.hideDialog();
        }
        public isDialogVisible() {
            let container = <HTMLElement>this.target.getElementsByClassName(this.containerClass)[0];
            if (!container) {
                return false;
            } else {
                if (container.style.display == "none") {
                    return false;
                } else {
                    return true;
                }
            }
        }
        public setToTurnOff() {
            this.turnOffNextTime = true;
        }
        public initialCheckDone() {
            if (!this.initialCheck) {
                this.initialCheck = true;
            }
        }
        public updateImage() {
            let img = this.getDimensionImage();
            this.img_element.setAttribute("src", img);
        }
        public getDimensionImage(): string {
            let viewport = this.visual.viewport;

            let height = viewport.height;
            let width = viewport.width;
            let aspectRatio = width / height;
            let best = "300x200";
            if (aspectRatio >= 1) {
                if (width >= 600) {
                    if (height >= 600) {
                        best = "600x400";
                    } else if (height >= 500) {
                        best = "500x500";
                    } else if (height >= 400) {
                        best = "600x400";
                    } else if (height >= 300) {
                        best = "200x300";
                    } else {
                        best = "300x200";
                    }
                } else if (width >= 500) {
                    if (height >= 500) {
                        best = "500x500";
                    } else if (height >= 400) {
                        best = "300x200";
                    } else if (height >= 300) {
                        best = "300x200";
                    } else {
                        best = "300x200";
                    }
                } else if (width >= 400) {
                    if (height >= 400) {
                        best = "200x300";
                    } else if (height >= 300) {
                        best = "200x300";
                    } else {
                        best = "300x200";
                    }
                } else if (width >= 300) {
                    if (height >= 300) {
                        best = "200x300";
                    } else {
                        best = "300x200";
                    }
                } else {
                    best = "200x300";
                }
            } else {
                if (width >= 600) {
                    if (height >= 600) {
                        best = "400x600";
                    }
                } else if (width >= 500) {
                    if (height >= 600) {
                        best = "400x600";
                    } else if (height >= 500) {
                        best = "500x500";
                    }
                } else if (width >= 400) {
                    if (height >= 600) {
                        best = "400x600";
                    } else if (height >= 500) {
                        best = "200x300";
                    } else if (height >= 400) {
                        best = "200x300";
                    }
                } else if (width >= 300) {
                    best = "200x300";
                } else {
                    best = "200x300";
                }
            }

            let img = this.options.images[best];
            return img;
        }
        public showGetFullVersionLogo() {
            if(!this.enabled) {
                return;
            }
            let target = this.target;
            this.full_version_logo = document.createElement("div");
            let logo = this.full_version_logo;
            logo.className = "get-paid-logo";
            logo.style.transform = "scale(0.5,0.5)";
            logo.style.right = "-118px";
            logo.style.bottom = "-19px";
            target.appendChild(logo);

            let host = this.host;
            let url = this.options.url;
            let fn1 = function () {
                openURL(host, url);
            }
            logo.addEventListener("click", fn1);
        }
        
    }

    export function openURL(host: IVisualHost, url: string) {
        host.launchUrl(url);
    }
}
