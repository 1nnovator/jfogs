(function (exportName) {

  /*<remove>*/
  'use strict';
  /*</remove>*/

  /*<jdists encoding="ejs" data="../package.json">*/
  /**
   * @file <%- name %>
   *
   * <%- description %>
   * @author
       <% (author instanceof Array ? author : [author]).forEach(function (item) { %>
   *   <%- item.name %> (<%- item.url %>)
       <% }); %>
   * @version <%- version %>
       <% var now = new Date() %>
   * @date <%- [
        now.getFullYear(),
        now.getMonth() + 101,
        now.getDate() + 100
      ].join('-').replace(/-1/g, '-') %>
   */
  /*</jdists>*/

  var esprima = require('esprima');
  var fs = require('fs');

  function obfuscate(code, options) {
    if (!code) {
      return code;
    }
    options = options || {};

    code = String(code).replace(/\r\n?|[\n\u2028\u2029]/g, '\n')
      .replace(/^\uFEFF/, ''); // 数据清洗
    var syntax = esprima.parse(code, {
      range: true,
      loc: false
    });

    var memberExpressions = [];
    var propertys = {};
    var names = [];
    var expressions = [];
    var guid = 0;

    function scan(obj) {
      if (!obj) {
        return;
      }
      if (obj.type === 'MemberExpression') {
        if (obj.property.type === 'Literal' ||
          (obj.property.type === 'Identifier' && !obj.computed)) {
          memberExpressions.push(obj);
          var name = JSON.stringify(obj.property.type === 'Literal' ?
            obj.property.raw : obj.property.name);
          if (!propertys[name]) {
            propertys[name] = '$jfogs$' + (guid++);
            names.push(propertys[name]);
            expressions.push(name);
          }
        }
      }
      for (var key in obj) {
        if (typeof obj[key] === 'object') {
          scan(obj[key]);
        }
      }
    }
    scan(syntax);
    memberExpressions.sort(function (a, b) {
      return b.property.range[0] - a.property.range[1];
    });

    memberExpressions.forEach(function (obj) {
      var name = JSON.stringify(obj.property.type === 'Literal' ?
        obj.property.raw : obj.property.name);
      if (obj.property.type === 'Literal') {
        code = code.slice(0, obj.property.range[0]) + propertys[name] +
          code.slice(obj.property.range[1]);
      }
      else {
        code = code.slice(0, obj.object.range[1]) +
          '[' + propertys[name] + ']' +
          code.slice(obj.property.range[1]);
      }
    });

    return '(function (' + names.join(', ') + ') {\n' + code + '\n})(' +
      expressions.join(', ') + ');';
  }
  exports.obfuscate = obfuscate;

  if (typeof define === 'function') {
    if (define.amd || define.cmd) {
      define(function () {
        return exports;
      });
    }
  }
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }
  else {
    window[exportName] = exports;
  }

})('jrands');