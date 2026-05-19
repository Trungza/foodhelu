export function redirectToGateway(message = "") {
    const target = "../../index.html" + (message ? `?error=${encodeURIComponent(message)}` : "");
    window.location.replace(target);
}
