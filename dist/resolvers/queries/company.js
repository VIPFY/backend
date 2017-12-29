"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _permissions = require("../../helpers/permissions");

exports.default = {
  allCompanies: function allCompanies(parent, args, _ref) {
    var models = _ref.models;
    return models.Company.findAll();
  },

  allDepartments: _permissions.requiresAuth.createResolver(function (parent, args, _ref2) {
    var models = _ref2.models;
    return models.Department.findAll();
  }),

  fetchDepartmentsByCompanyId: _permissions.requiresAuth.createResolver(function (parent, _ref3, _ref4) {
    var companyId = _ref3.companyId;
    var models = _ref4.models;
    return models.Department.findAll({
      where: { companyid: companyId }
    });
  }),

  fetchCompany: function fetchCompany(parent, _ref5, _ref6) {
    var id = _ref5.id;
    var models = _ref6.models;
    return models.Company.findById(id);
  },

  fetchDepartment: function fetchDepartment(parent, _ref7, _ref8) {
    var departmentId = _ref7.departmentId;
    var models = _ref8.models;
    return models.Department.findById(departmentId);
  }
};