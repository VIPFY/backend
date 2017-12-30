import { requiresAuth } from "../../helpers/permissions";

export default {
  allCompanies: (parent, args, { models }) => models.Company.findAll(),

  allDepartments: requiresAuth.createResolver((parent, args, { models }) =>
    models.Department.findAll()
  ),

  fetchDepartmentsByCompanyId: requiresAuth.createResolver(
    (parent, { companyId }, { models }) =>
      models.Department.findAll({
        where: { companyid: companyId }
      })
  ),

  fetchCompany: (parent, { id }, { models }) => models.Company.findById(id),

  fetchDepartment: (parent, { id }, { models }) =>
    models.Department.findById(id)
};
