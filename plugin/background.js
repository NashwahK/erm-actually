// this script runs in the background. deals with user actions. 
// we would be setitng up listeners here, and coordinating with APIs

chrome.runtime.onInstalled.addListener(() => {
    console.log("The stickler has entered the chat. ");
  });
  