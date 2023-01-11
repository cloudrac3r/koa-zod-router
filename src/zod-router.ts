import { Method, RegisterSpec, Spec, ValidationOptions, RouterMethods, ZodMiddleware } from './types';
import KoaRouter, { ParamMiddleware } from '@koa/router';
import { prepareMiddleware } from './util/index';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import { validationMiddleware } from './validation-middleware';

const methods: Method[] = [
  'acl',
  'bind',
  'checkout',
  'connect',
  'copy',
  'delete',
  'get',
  'head',
  'link',
  'lock',
  'm-search',
  'merge',
  'mkactivity',
  'mkcalendar',
  'mkcol',
  'move',
  'notify',
  'options',
  'patch',
  'post',
  'propfind',
  'proppatch',
  'purge',
  'put',
  'rebind',
  'report',
  'search',
  'source',
  'subscribe',
  'trace',
  'unbind',
  'unlink',
  'unlock',
  'unsubscribe',
];

const zodRouter = (routerOpts?: KoaRouter.RouterOptions) => {
  const _router = new KoaRouter(routerOpts);
  _router.use(bodyParser());

  // Delegated methods - preserves value of 'this' in KoaRouter
  function all(...args: any[]) {
    return _router.all(args);
  }

  function allowedMethods(options?: KoaRouter.RouterAllowedMethodsOptions) {
    return _router.allowedMethods(options);
  }

  function match(path: string, method: string) {
    return _router.match(path, method);
  }

  function middleware() {
    return _router.middleware();
  }

  function param(path: string, middleware: ParamMiddleware) {
    return _router.param(path, middleware);
  }

  function prefix(path: string) {
    return _router.prefix(path);
  }

  function redirect(source: string, destination: string, code?: number) {
    return _router.redirect(source, destination, code);
  }

  function route(name: string) {
    return _router.route(name);
  }

  function routes() {
    return _router.routes();
  }

  function use(...args: any[]) {
    return _router.use(args);
  }

  function url(name: string, params?: any, options?: KoaRouter.UrlOptionsQuery) {
    return _router.url(name, params, options);
  }

  /**
   * Create and register a route
   *
   * @example
   *
   * ```javascript
   *  router.register({
   *    path: '/',
   *    method: 'get',
   *    handlers: (ctx, next) => {
   *      ctx.body = 'Hello world';
   *      next();
   *     },
   *     validate: {
   *       output: z.string(),
   *     },
   *  });
   * ```
   */

  function register<
    Params = Record<string, any>,
    Query = Record<string, any>,
    Body = Record<string, any>,
    Response = Record<string, any>,
  >(spec: RegisterSpec<Params, Query, Body, Response>) {
    const methodsParam: string[] = Array.isArray(spec.method) ? spec.method : [spec.method];

    const name = spec.name ? spec.name : null;

    _router.register(
      spec.path,
      methodsParam,
      // @ts-ignore ignore global extension from @types/koa-bodyparser on Koa.Request['body']
      [
        ...prepareMiddleware<Params, Query, Body, Response>(spec.pre),
        validationMiddleware(spec.validate),
        ...prepareMiddleware<Params, Query, Body, Response>(spec.handlers),
      ],
      { name },
    );

    return _router;
  }

  const makeRouteMethods = () =>
    methods.reduce((acc: RouterMethods, method: Method) => {
      acc[method] = <Params, Query, Body, Response>(
        pathOrSpec: string | Spec<Params, Query, Body, Response>,
        handlers?: ZodMiddleware<Params, Query, Body, Response>,
        validationOptions?: ValidationOptions<Params, Query, Body, Response>,
      ) => {
        if (typeof pathOrSpec === 'string' && handlers) {
          register({
            method,
            path: pathOrSpec,
            handlers,
            validate: validationOptions,
          });

          return _router;
        }

        if (typeof pathOrSpec === 'object') {
          register({
            ...pathOrSpec,
            method,
          });

          return _router;
        }

        throw new Error('Invalid route arguments');
      };

      return acc;
    }, {} as RouterMethods);

  return {
    ...makeRouteMethods(),
    get router() {
      return _router;
    },
    register,
    // Delegated methods - we preserve KoaRouter type definitions with assertions
    all: all as Router['all'],
    allowedMethods: allowedMethods as Router['allowedMethods'],
    match: match as Router['match'],
    methods: _router.methods as Router['methods'],
    middleware: middleware as Router['middleware'],
    opts: _router.opts,
    param: param as Router['param'],
    params: _router.params,
    prefix: prefix as Router['prefix'],
    redirect: redirect as Router['redirect'],
    route: route as Router['route'],
    routes: routes as Router['routes'],
    stack: _router.stack,
    use: use as Router['use'],
    url: url as Router['url'],
  } as const;
};

export default zodRouter;
