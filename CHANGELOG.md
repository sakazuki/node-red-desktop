## V1.2.1
- udpate: Node-RED 1.2.2 -> 1.2.3
- update: electron 10.1.3 -> 10.1.5

## v1.2.0
- udpate: Node-RED 1.1.3 -> 1.2.2
- fix: examples directory is not packed

## v1.1.1
- update: electron 10.1.2 -> 10.1.3
- update: ngrok

## v1.1.0
- udpate: Node-RED 1.0.3+v-flow -> 1.1.3
- update: electron 7.1.2 -> 10.1.2
- add: validation in settings #17
- add: deepmerge user settings #23
- update: settings page with Node-RED style

## v1.0.0
- new: debug out on all nodes
- new: vertical flow option
- new: open a new window in the app with ctrl+click(mac: command+click) #3
- add: Listen Port property in settings
- update: Node-RED 1.0.0 -> 1.0.3+v-flow
- update: electron 6.0.10 -> 7.1.2
- fix #4

## v0.9.5
- update: electron 5.0.8 -> 6.0.10
- update: Node-RED 0.20.7 -> 1.0.0

## v0.9.4
- add: first load ${userDir}/settings.js, and override it with NRD settings #11

## v0.9.3
- update: Node-RED 0.20.6 -> 0.20.7
- update: electron 5.0.5 -> 5.0.8
- change: hide the message of check update #9

## v0.9.2
- update: Node-RED 0.20.5 -> 0.20.6
- update: electron 5.0.2 -> 5.0.5

## v0.9.1
- improve: speed up npm or external command by NODE_ENV=production

## v0.9.0
- add: menu to install a local node (Npm link)
- add: menu to install a remote node (Npm install)
- add: menu to run [Node generator](https://github.com/node-red/node-red-nodegen)
- add: menu to relaunch #7
- add: auto rebuild when the error "was compiled against a different Node.js version using" is found.
- add: env **NRD_AUTO_REBUILD=false** to disable auto rebuilding.
- add: env **NRD_NGROK_START_ARGS** to pass Ngrok start args
- add: env **NRD_IP_ALLOWS** to access admin page from specific ip addresses. (ex: 118.123.45.67,2001:db8:85a3:1:0:8a2e:370:7334)
- add: settings of Open Last File
- add: settings of HTTP Auth Node
- change: rename env **LISTEN_IP**, **LISTEN_PORT** to **NRD_LISTEN_IP**, **NRD_LISTEN_PORT**
- change: mac menu interface #6
- change: win hide zoom menu
- fix: Mac can't move window #4
