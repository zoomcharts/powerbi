/// <reference path="../../common/src/config.ts" />

module powerbi.extensibility.visual {
    export function addFreeVersionLogo(settings:any){
        settings.credits = {
            image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJ4AAAAtCAYAAABf29KgAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABA9pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQyIDc5LjE2MDkyNCwgMjAxNy8wNy8xMy0wMTowNjozOSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ1dWlkOjU4MDZiZGQ4LWNkOWEtNDY3MS05ZTg1LTcwOWFlZDg0MDY4YyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2NDhGMEQzMUMwQzMxMUU4OTFDREMyMjc3RjVFQjUxQyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2NDhGMEQzMEMwQzMxMUU4OTFDREMyMjc3RjVFQjUxQyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNzUwNzVmMi1jYzVlLTg0NGUtYjExOC0wMzc0ZDg0ZGU2ZjkiIHN0UmVmOmRvY3VtZW50SUQ9ImFkb2Jl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",
            enabled: true,
            location: "inside"
        };
    }

    export class customizationInformer {
        public target: HTMLElement = null;
        public initialCheck: boolean = false;
        public containerClass: string = "message-overlay-get-paid";
        private container: HTMLElement = null;
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
            },
            upgrade_url: ""
        };
        constructor(target, visual: Visual, options?: any) {
            this.target = target;
            this.visual = visual;
            this.host = visual.host;
            this.options = options;

            this.container = document.createElement("div");
            this.container.className = this.containerClass;
            target.appendChild(this.container);

            this.container.style.display = "";

            let span = document.createElement("span");
            span.setAttribute("class", "helper");
            this.container.appendChild(span);

            //add image here:
            this.img_element = document.createElement("img");
            this.img_element.setAttribute("class", "action-btn");
            this.container.appendChild(this.img_element);

            let host = this.host;
            let url = this.options.upgrade_url;
            let fn1 = function () {
                openURL(host, url);
            }
            let el = target.getElementsByClassName("action-btn")[0];
            el.addEventListener("click", fn1);

            registerMessage(this.container);
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
            if (!this.container){
                return;
            }
            this.container.style.display = "block";
        }
        public hideDialog() {
            this.initialCheckDone();
            if (!this.container) {
                return;
            }
            this.container.style.display = "none";
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
        public updateImage(viewport:any) {
            let img = this.getDimensionImage(viewport);
            this.img_element.setAttribute("src", img);
        }
        public getDimensionImage(viewport:any): string {

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

            let img = this.options.url + this.options.images[best];
            return img;
        }
    }
}

