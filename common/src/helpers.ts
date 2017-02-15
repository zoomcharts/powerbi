module powerbi.extensibility.visual {
    let isDebugVisual = /plugin=[^&]*_DEBUG&/.test(document.location.toString());

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
}