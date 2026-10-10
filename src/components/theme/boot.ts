export const themeStorageKey = "kondis-theme";

export const themeBootScript = `try{var t=localStorage.getItem(${JSON.stringify(themeStorageKey)});if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;
