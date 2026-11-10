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
