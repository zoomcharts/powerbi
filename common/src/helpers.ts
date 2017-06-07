module powerbi.extensibility.visual {
    export let isDebugVisual = /plugin=[^&]*_DEBUG&/.test(document.location.toString()) || (document.location.search || "").indexOf("unmin") > -1;

    try {
        Number(window.devicePixelRatio);
    } catch (e) {
        console.warn("Cannot read window.devicePixelRatio. Applying workaround. See https://github.com/Microsoft/PowerBI-visuals-tools/issues/81", e);

        Object.defineProperty(window, "devicePixelRatio", {
            get: () => 1
        });
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
    
    export function getColor(category: DataViewCategoricalColumn, rowIndex: number, objectName: string): IColorInfo {
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
}