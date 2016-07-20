
// автоматическое обновление приложения на nw.js
var fs = require('fs');
var path = require('path');
var gui = require('nw.gui');
var upd, copyPath, execPath, updateInterval;

module.exports = update;

function update (cfg) {
	cfg = cfg || {};

	if (!cfg.package) { return; };

	cfg.update = cfg.update || 1000 * 60 * 10;
	cfg.beforeDownload = cfg.beforeDownload || function (updateInterval, manifest, download) {
		download(manifest);
	};
	cfg.beforeInstall = cfg.beforeInstall || function () {};
	cfg.onInstallError = cfg.onInstallError || function () {};

	var pkg = require(cfg.package);
	var updater = require('node-webkit-updater');

	upd = new updater(pkg);

	// если при запуске переданы данные новой версии
	if (gui.App.argv.length) {
		copyPath = gui.App.argv[0];
		execPath = gui.App.argv[1];

		// устанавливаем новую версию
		install(cfg);
	}
	else {

		// периодически проверяем наличие обновлений
		if (cfg.update !== 0) {
			timer(cfg);
		};

		// получаем информацию об обновлении
		checker(cfg);
	};
};


// получаем информацию об обновлении
function checker (cfg) {
	upd.checkNewVersion(function (error, newVersionExists, manifest) {
		if (!error && newVersionExists) {
			cfg.beforeDownload(updateInterval, manifest, download);
		};
	});
};

// скачиваем новую версию
function download (manifest) {
	upd.download(function (error, filename) {
		if (!error) {

			// получаем файлы новой версии
			upd.unpack(filename, function (error, newAppPath) {
				if (!error) {

					// копируем файлы новой версии
					upd.runInstaller(newAppPath, [upd.getAppPath(), upd.getAppExec()],{});
					gui.App.quit();
				};
			}, manifest);
		};
	}, manifest);
};

// периодическая проверка новой версии
function timer (cfg) {
	updateInterval = setInterval(function () {
		checker();
	}, cfg.update);
};

// замена файлов приложения
function install (cfg) {
	cfg.beforeInstall();

	upd.install(copyPath, function (error) {

		// если замена неудачна
		if (error) {
			cfg.onInstallError(install);
		}

		// иначе стартуем обновлённое приложение из его нормального места
		else {
			upd.run(execPath, [], {});
			gui.App.quit();
		};
	});
};
