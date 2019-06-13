# Node-RED Desktop

Node-REDのデスクトップ版です

![screen](https://raw.githubusercontent.com/sakazuki/node-red-desktop/doc/screenshot.png)

## ダウンロード


[リリースページ](https://github.com/sakazuki/node-red-desktop/releases)から、実行ファイルをダウンロードしてください。

- Windows: [**Node-RED-Desktop_Setup_X.X.X.exe**](https://github.com/sakazuki/node-red-desktop/releases)
- Mac: [**Node-RED-Desktop-X.X.X.dmg**](https://github.com/sakazuki/node-red-desktop/releases)

## メリット
- Node-REDを簡単に使い始めることができます
- フロー作成の試行錯誤がすばやくできます
- クラウドサービスとのAPI連携が簡単にできます
  - Twilio, Alexa, Google home など
- プライベートノードの追加が簡単にできます

これらに加えて、
Node-REDの便利な機能の殆どを使うことができます。

  - [公式ライブラリ](https://flows.nodered.org/) からのノート追加
  - [プロジェクト機能](https://nodered.org/docs/user-guide/projects/)
  - など

## 特徴

- [Node-RED](https://nodered.org/) v0.20.5
- [ngrok](https://ngrok.com/) 組み込み済み
- [Node generator](https://www.npmjs.com/package/node-red-nodegen)  組み込み済み
- npm 組み込み済み
- 多言語UI
  - english
  - japanese
- 自動更新

## Node-RED-Desktopのインストール方法

1. [リリースページ](https://github.com/sakazuki/node-red-desktop/releases)からインストーラーをダウンロードします
1. インストーラーを実行します

## Node-REDの使い方

1. 普通のNode-RED の使い方と同じです
1. 初心者の方は、[Node-RED document](https://nodered.org/docs/)　を参照してください

## HTTPエンドポイントの公開方法

1. **"http in"** と **"http response"** ノードを使ったフローを作成してデプロイします。
1. **[エンドポイント]-[ngrokに接続]**をクリックします
1. https://1234xxxx.ngrok.com　のようなURLが発行されます
1. このURLにアクセスします
- **注意事項** **[File|Applicetion]-[Settings...]**でHTTPアクセス認証設定をしないと、誰でもこのURLにアクセスできます。

## Node-RED プロジェクト機能を使う

- 前提条件:
  - gitコマンドがインストール済みで使える状態であること (win:Command Prompt or mac:bash)
  - refs: [git](https://git-scm.com/downloads)

1. go **[File]-[Settings...]**
1. checked **[Projects enabled]**
1. click **[Restart to apply]**

## 追加ノードをインストールする

1. click **[Manage pallete]-[install]**

- This function uses Node-RED Destktop builtin npm.  
Some npm modules need to be compiled from node binary or C/C++ when installing.  
In such cases, you need to install node.js before.  
If so, please install node v12.x.x from [Node.js official site](https://nodejs.org/) and retry to install them.
  
  You can test to use `node` command with this flow.

  ```
  [{"id":"7a4efcce.89b8c4","type":"inject","z":"c37c6de7.10798","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":140,"y":60,"wires":[["d1acddb8.e8361"]]},{"id":"d1acddb8.e8361","type":"exec","z":"c37c6de7.10798","command":"node -v","addpay":false,"append":"","useSpawn":"false","timer":"","oldrc":false,"name":"","x":320,"y":60,"wires":[["9483c8bb.2c7d58"],["9483c8bb.2c7d58"],["9483c8bb.2c7d58"]]},{"id":"9483c8bb.2c7d58","type":"debug","z":"c37c6de7.10798","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":490,"y":60,"wires":[]}]
  ```

- In some cases, the error like **NODE_MODULE_VERSION** mismatch occures.

  ```
  [2019-05-24 19:38:00.395] [warn] [node-red-node-serialport/serialport] Error: The module '\\?\C:\Users\abc\.Node-RED-Desktop\node_modules\@serialport\bindings\build\Release\bindings.node'
  was compiled against a different Node.js version using
  NODE_MODULE_VERSION 47. This version of Node.js requires
  NODE_MODULE_VERSION 70. Please try re-compiling or re-installing
  ```
  
  Then you need some step.

  ```
  ## Windows
  > npm install -g electron-rebuild
  > cd %USERPROFILE%\.Node-RED-Desktop
  > electron-rebuild --version 5.0.0
  
  ## Mac
  $ npm install -g electron-rebuild
  $ cd $USER/.Node-RED-Desktop
  $ electron-rebuild --version 5.0.0
  ```

## How to use excluded standard nodes

- You can activate them at **[Nodes exclude]** form in **[File]-[Settings...]**.  
When you activate the MQTT node, Delete `10-mqtt.js` from **[Node exclude]**.

- Default **[Nodes exclude]** is below
  ```
  10-mqtt.js
  16-range.js
  31-tcpin.js
  32-udp.js
  36-rpi-gpio.js
  89-trigger.js
  node-red-node-tail
  node-red-node-sentiment
  node-red-node-rbe
  ```

- I have selected default **[Nodes exclude]** to simple the first look for beginners.  
There is not technical reason.


## More information

- Check also [Wiki page](https://github.com/sakazuki/node-red-desktop/wiki)
