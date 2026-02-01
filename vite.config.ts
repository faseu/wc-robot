import path from 'node:path'
import { execSync } from 'node:child_process'
import dayjs from 'dayjs'
import { defineConfig, loadEnv } from 'vite'
import Uni from '@dcloudio/vite-plugin-uni'
// @see https://uni-helper.js.org/vite-plugin-uni-pages
import UniPages from '@uni-helper/vite-plugin-uni-pages'
// @see https://uni-helper.js.org/vite-plugin-uni-layouts
import UniLayouts from '@uni-helper/vite-plugin-uni-layouts'
// @see https://github.com/uni-helper/vite-plugin-uni-platform
// 需要与 @uni-helper/vite-plugin-uni-pages 插件一起使�?
import UniPlatform from '@uni-helper/vite-plugin-uni-platform'
// @see https://github.com/uni-helper/vite-plugin-uni-manifest
import UniManifest from '@uni-helper/vite-plugin-uni-manifest'
// @see https://unocss.dev/
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import ViteRestart from 'vite-plugin-restart'

// https://vitejs.dev/config/
export default ({ command, mode }) => {
	// console.log(mode === process.env.NODE_ENV) // true

	// mode: 区分生产环境还是开发环�?
	console.log('command, mode -> ', command, mode)
	// pnpm dev:h5 时得�?=> serve development
	// pnpm build:h5 时得�?=> build production
	// pnpm dev:mp-weixin 时得�?=> build development (注意区别，command为build)
	// pnpm build:mp-weixin 时得�?=> build production
	// pnpm dev:app 时得�?=> build development (注意区别，command为build)
	// pnpm build:app 时得�?=> build production
	// dev �?build 命令可以分别使用 .env.development �?.env.production 的环境变�?

	const { UNI_PLATFORM } = process.env
	console.log('UNI_PLATFORM -> ', UNI_PLATFORM) // 得到 mp-weixin, h5, app �?

	const env = loadEnv(mode, path.resolve(process.cwd(), 'env'))
	const {
		VITE_APP_PORT,
		VITE_SERVER_BASEURL,
		VITE_DELETE_CONSOLE,
		VITE_SHOW_SOURCEMAP,
		VITE_APP_PROXY,
		VITE_APP_PROXY_PREFIX,
	} = env
	console.log('环境变量 env -> ', env)

	return defineConfig({
		envDir: './env', // 自定义env目录

		plugins: [
			UniPages({
				exclude: ['**/components/**/**.*'],
				routeBlockLang: 'json5', // 虽然设了默认值，但是vue文件还是要加�?lang="json5", 这样才能很好地格式化
				// homePage 通过 vue 文件�?route-block 的type="home"来设�?
				// pages 目录�?src/pages，分包目录不能配置在pages目录�?
				dts: 'src/types/uni-pages.d.ts',
			}),
			UniLayouts(),
			UniPlatform(),
			UniManifest(),
			UniPages(),
			// UniXXX 需要在 Uni 之前引入
			Uni(),
			{
				// 临时解决 dcloudio 官方�?@dcloudio/uni-mp-compiler 出现的编�?BUG
				// 参�?github issue: https://github.com/dcloudio/uni-app/issues/4952
				// 自定义插件禁�?vite:vue 插件�?devToolsEnabled，强制编�?vue 模板�?inline �?true
				name: 'fix-vite-plugin-vue',
				configResolved(config) {
					const plugin = config.plugins.find((p) => p.name === 'vite:vue')
					if (plugin && plugin.api && plugin.api.options) {
						plugin.api.options.devToolsEnabled = false
					}
				},
			},
			UnoCSS(),
			AutoImport({
				imports: ['vue', 'uni-app'],
				dts: 'src/types/auto-import.d.ts',
				dirs: ['src/hooks'], // 自动导入 hooks
				eslintrc: { enabled: true },
				vueTemplate: true, // default false
			}),

			ViteRestart({
				// 通过这个插件，在修改vite.config.js文件则不需要重新运行也生效配置
				restart: ['vite.config.js'],
			}),
			// h5环境增加 BUILD_TIME �?BUILD_BRANCH
			UNI_PLATFORM === 'h5' && {
				name: 'html-transform',
				transformIndexHtml(html) {
					return html.replace('%BUILD_TIME%', dayjs().format('YYYY-MM-DD HH:mm:ss'))
				},
			},
			// 打包分析插件，h5 + 生产环境才弹�?
			UNI_PLATFORM === 'h5' &&
			mode === 'production' &&
			visualizer({
				filename: './node_modules/.cache/visualizer/stats.html',
				open: true,
				gzipSize: true,
				brotliSize: true,
			}),
		],
		define: {
			__UNI_PLATFORM__: JSON.stringify(UNI_PLATFORM),
			__VITE_APP_PROXY__: JSON.stringify(VITE_APP_PROXY),
		},
		css: {
			postcss: {
				plugins: [
					// autoprefixer({
					//   // 指定目标浏览�?
					//   overrideBrowserslist: ['> 1%', 'last 2 versions'],
					// }),
				],
			},
		},

		resolve: {
			alias: {
				'@': path.join(process.cwd(), './src'),
				'@img': path.join(process.cwd(), './src/static/images'),
			},
		},
		server: {
			host: '0.0.0.0',
			hmr: true,
			port: Number.parseInt(VITE_APP_PORT, 10),
			// �?H5 端生效，其他端不生效（其他端走build，不走devServer)
			proxy: JSON.parse(VITE_APP_PROXY)
				? {
					[VITE_APP_PROXY_PREFIX]: {
						target: VITE_SERVER_BASEURL,
						changeOrigin: true,
						rewrite: (path) => path.replace(new RegExp(`^${VITE_APP_PROXY_PREFIX}`), ''),
					},
				}
				: undefined,
		},
		build: {
			// 方便非h5端调�?
			sourcemap: VITE_SHOW_SOURCEMAP === 'true', // 默认是false
			target: 'es6',
			// 开发环境不用压�?
			minify: mode === 'development' ? false : 'terser',
			terserOptions: {
				compress: {
					drop_console: VITE_DELETE_CONSOLE === 'true',
					drop_debugger: true,
				},
			},
		},
	})
}
