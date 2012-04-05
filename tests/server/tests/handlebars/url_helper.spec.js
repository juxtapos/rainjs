"use strict";

var cwd = process.cwd(),
    globals = require(cwd + '/lib/globals.js'),
    mock = require(cwd + '/tests/server/rain_mocker'),
    url = require('url'),
    qs = require('querystring');

/**
 * Tests for the handlebars url helper.
 * They are done using triple mustache syntax to avoid normal HTML escaping that goes on.
 */
describe('Handlebars url helper', function () {
        // some test components
    var components = {
            example: { id: 'example', version: '1.0' },
            map: { id: 'map', version: '2.0' }
        },
        // the rain context
        ctx = { component: components.example };

    var helper = mock(
        cwd + '/lib/handlebars/url.js',
        {
            '../renderer': { rain: ctx },
            '../component_registry': {
                // mocked getLatestVersion for the 'map' example component
                getLatestVersion: function () { return components.map.version; }
            }
        }
    );

    var Handlebars = require('handlebars');
    Handlebars.registerHelper(helper.name, helper.helper);

    /**
     * Assembles a resource URL for a specific component, version and path
     *
     * @param {String} src the resource path
     * @param {String} [name] component name
     * @param {String} [version] component version
     * @returns {String} the assembled path
     */
    function assemble(src, name, version) {
        return encodeURI(
            [
                '/',
                encodeURIComponent(name),
                '/',
                encodeURIComponent(version),
                '/resources/',
                src
            ].join('')
        );
    }

    describe('register plugin to handlebars', function () {

        it('must register the url helper to handlebars', function () {
            expect(helper.name).toEqual('url');
            expect(typeof helper.helper).toEqual('function');
        });
    });

    describe('test preconditions', function () {

        it('must return an empty string for an invalid path', function () {
            var result = Handlebars.compile('{{{url path=src}}')({src: new String() });
            expect(result).toBe('');
        });

        it('must return an empty string for an empty parameter list', function () {
            var result = Handlebars.compile('{{{url}}}')();
            expect(result).toBe('');
        });

        it('must correctly url encode paths', function () {
            var src = 'path with spaces/to/image.jpg',
                result = Handlebars.compile('{{{url path=src}}}')({src: src}),
                c = ctx.component;

            expect(result).toBe(assemble(src, c.id, c.version));
        });
    });

    describe('test non-localized urls', function () {

        describe('test urls relative to current component', function () {

            it('must resolve paths to current component when name & version aren\'t present',
                function () {
                    var src = 'path/to/image.jpg',
                        result = Handlebars.compile('{{{url path=src}}}')({src: src}),
                        c = ctx.component;

                    expect(result).toBe(assemble(src, c.id, c.version));
            });

            it('must correctly handle query parameters', function () {
                    var src = 'path/to/image.jpg?w=100&h=100&q=0.8',
                        result = Handlebars.compile('{{{url path=src}}}')({src: src}),
                        c = ctx.component;

                    expect(result).toBe(assemble(src, c.id, c.version));
            });

            it('must correctly resolve a path with a starting /', function () {
                var src = '/path/to/image.jpg',
                    result = Handlebars.compile('{{{url path=src}}}')({src: src}),
                    c = ctx.component;

                expect(result).toBe([
                    '/', c.id, '/', c.version,
                    '/resources/', src.substring(1)
                ].join(''));
            });

            it('must leave external urls unmodified', function () {
                var src = 'http://www.rainjs.org/',
                    result = Handlebars.compile('{{{url path=src}}}')({src: src});
                expect(result).toBe(src);
            });

            it('must ignore version if no name is present', function () {
                var data = {
                        src: 'path/to/image.jpg',
                        version: '3.5'
                    },
                    c = ctx.component,
                    tpl = Handlebars.compile('{{{url path=src version=version}}}'),
                    result = tpl(data);

                expect(result).toBe(assemble(data.src, c.id, c.version));
            });

        });

        describe('test urls that cross-reference other components', function () {

            it('must correctly resolve cross-referencing urls without version', function () {
                var data = {
                        src: 'path/to/image.jpg',
                        name: 'map'
                    },
                    tpl = Handlebars.compile('{{{url path=src name=name}}}'),
                    result = tpl(data);

                expect(result).toBe(assemble(data.src, data.name, components.map.version));
            });

            it('must correctly resolve cross-referencing urls', function () {
                var data = {
                        src: 'path/to/image.jpg',
                        name: components.map.id,
                        version: components.map.version
                    },
                    tpl = Handlebars.compile('{{{url path=src name=name version=version}}}'),
                    result = tpl(data);

                expect(result).toBe(assemble(data.src, data.name, data.version));
            });

            it('must correctly handle query parameters', function () {
                    var data = {
                            src: 'path/to/image.jpg?w=100&h=100&q=0.8',
                            name: components.map.id,
                            version: components.map.version
                        },
                        tpl = Handlebars.compile('{{{url name=name version=version path=src}}}'),
                        result = tpl(data);

                    expect(result).toBe(assemble(data.src, data.name, data.version));
            });

            it('must correctly resolve a path with a starting /', function () {
                var data = {
                        src: '/path/to/image.jpg',
                        name: components.map.id,
                        version: components.map.version
                    },
                    tpl = Handlebars.compile('{{{url name=name version=version path=src}}}'),
                    result = tpl(data);

                expect(result).toBe(assemble(data.src.substring(1), data.name, data.version));
            });

        });

    });

    describe('test localized urls', function () {

        it('must add a loc query parameter for localized urls', function () {
            var data = {
                    src: 'path/to/image.jpg',
                    localized: true
                },
                tpl = Handlebars.compile('{{{url path=src localized=localized}}}'),
                result = tpl(data),
                c = ctx.component;
            
            var q = qs.parse(url.parse(result).query);
            expect(q.loc).toBeDefined();
        });

        it('must keep existing query parameters', function () {
            var data = {
                    src: 'path/to/image.jpg?w=100&h=100&q=0.8',
                    localized: true
                },
                tpl = Handlebars.compile('{{{url path=src localized=localized}}}'),
                result = tpl(data),
                c = ctx.component;

            var q = qs.parse(url.parse(result).query);
            expect(q.loc).toBeDefined();
            expect(q.w).toBeDefined();
            expect(q.h).toBeDefined();
            expect(q.q).toBeDefined();
        })

    });

});