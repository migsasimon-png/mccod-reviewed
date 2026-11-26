const { override, fixBabelImports, addLessLoader, disableEsLint } = require('customize-cra');

module.exports = override(
    disableEsLint(),
    fixBabelImports('import', {
        libraryName: 'antd',
        libraryDirectory: 'es',
        style: true,
    }),
    addLessLoader({
        javascriptEnabled: true
    })
);

module.exports.devServer = (configure) => (proxy, allowedHost) => ({
    ...configure(proxy, allowedHost),
    hot: false,
    liveReload: false,
    watchContentBase: false,
});
