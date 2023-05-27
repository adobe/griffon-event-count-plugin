# griffon-event-count-plugin
Example project of how to build a Project Griffon View Plugin

## Prerequisites
- Node v18 and above (check [nvm](https://github.com/nvm-sh/nvm) for switching between versions)

## Getting Started

Plugins are registered via the [Plugin Bridge](https://github.com/adobe/griffon-plugin-bridge). A brief description of how to implement the bridge in a plugin is provided in the [wiki](https://github.com/adobe/griffon-event-count-plugin/wiki)

Plugins in Project Griffon are hosted on a static server and are loaded in the UI as an iframe. We'll use [Parcel](https://parceljs.org/) to host our plugin locally.

```
npm install
npm run start
```

Plugin development can now be done within the Project Griffon UI itself. This is done by adding a plugin configuration object to local storage. The development plugin configuration is pulled from local storage and loaded along with the existing plugins. 
You may configure it as follows:

```
localStorage.setItem('griffonPlugin', JSON.stringify([{
  displayName: 'Event Counter',
  src: 'https://localhost:1234/index.html'
}]))
```

Notes: 
_Make sure when calling setItem on localStorage that it is done on the iframe for ui.griffon.adobe.com_

_You might need to load https://localhost:1234/index.html in a separate tab and accept the invalid certificate_

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE.md) for more information.
