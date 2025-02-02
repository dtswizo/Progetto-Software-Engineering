import { expect, jest } from '@jest/globals';
import request from 'supertest'
import express from 'express';
import { spyCustomer, spyManager, spyAdmin, spyNotLogged, enableMockedAuth, initMockedApp } from '../src/testUtilities'
import crypto from "crypto"
import UserController from '../src/controllers/userController';
import UserDAO from '../src/dao/userDAO';
import { User, Role } from '../src/components/user';
import { cleanup, cleanupDB } from '../src/db/cleanup';
import db from "../src/db/db"
import { app } from "../index"
import { UnauthorizedUserError, UserAlreadyExistsError, UserIsAdminError, UserNotAdminError, UserNotFoundError } from '../src/errors/userError';
import { DateError } from '../src/utilities';
import Authenticator from '../src/routers/auth';

let userDAO: UserDAO;
let userController: UserController;
let authenticator: Authenticator;

const userToAdd = { //Define a test user object sent to the route
    username: "MarioRossi",
    name: "Mario",
    surname: "Rossi",
    password: "test",
    role: "Customer"
}

const userToAdd2 = { //Define a test user object sent to the route
    username: "LuigiVerdi",
    name: "Luigi",
    surname: "Verdi",
    password: "test",
    role: "Manager"
}

const userToAdd3 = {
    username: "LuciaBianchi",
    name: "Lucia",
    surname: "Bianchi",
    password: "test",
    role: Role.ADMIN
}

const user = {
    username: "MarioRossi",
    name: "Mario",
    surname: "Rossi",
    role: Role.CUSTOMER,
    address: "",
    birthdate: ""
}

const manager = {
    username: "LuigiVerdi",
    name: "Luigi",
    surname: "Verdi",
    role: Role.MANAGER,
    address: "",
    birthdate: ""
}

const admin = {
    username: "LuciaBianchi",
    name: "Lucia",
    surname: "Bianchi",
    role: Role.ADMIN,
    address: "",
    birthdate: ""
}

const newUser = { //Define a test user object sent to the route
    username: "MarioRossi",
    name: "newName",
    surname: "newSurname",
    role: "Customer",
    address: "Torino, Via Madama Cristina 27",
    birthdate:"1980-01-01"
}
const newUser2 = { //Define a test user object sent to the route
    username: "LuigiVerdi",
    name: "newLuigi",
    surname: "newVerdi",
    role: Role.MANAGER,
    address: "Torino, Via Madama Cristina 27",
    birthdate:"1981-01-01"
}

const userToLog = {
    username: "MarioRossi",
    password: "test",
}

const createUser = async()=>{
    
    return new Promise<boolean>((resolve, reject) => {
        try {
            const salt = crypto.randomBytes(16)
            const hashedPassword = crypto.scryptSync(userToAdd.password, salt, 16)
            const sql = "INSERT INTO users(username, name, surname, role, password, salt) VALUES(?, ?, ?, ?, ?, ?)"
            db.run(sql, [userToAdd.username, userToAdd.name, userToAdd.surname, userToAdd.role, hashedPassword, salt], (err: Error | null) => {
                if (err) {
                    if (err.message.includes("UNIQUE constraint failed: users.username")) reject(new UserAlreadyExistsError)
                    reject(err)
                }
                resolve(true)
            })
        }
        catch(error){
            reject(error)
        }
    })
}

const deleteUser = async()=>{
    return new Promise<boolean>((resolve, reject) => {
        try {
            const sql = "DELETE FROM users WHERE username = ?";
            db.run(sql, [user.username], function (err: Error | null) {
                if (err) {
                    reject(err);
                    return;
                }

                if (this.changes === 0) {
                    reject(new UserNotFoundError());
                    return;
                }

                resolve(true);
            });
        } catch (error) {
            reject(error);
        }
    });
}

const deleteAll = async()=>{
    return new Promise<boolean>((resolve, reject) => {
        try {
            const sql = "DELETE FROM users WHERE role != 'Admin'";
            db.run(sql, [], (err: Error | null) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(true);
            });
        } catch (error) {
            reject(error);
        }
    });

}

const updateUserInfo = async()=>{
    
    return new Promise<User>((resolve, reject) => {
        try {
            const sql = `UPDATE users SET name = ?, surname = ?, address = ?, birthdate = ? WHERE username = ?`;
            db.run(sql, [newUser.name, newUser.surname, newUser.address, newUser.birthdate, newUser.username], function (err: Error | null) {
                if (err) {
                    reject(err);
                    return;
                }

                //Questo controllo dovrebbe essere superfluo
                if (this.changes === 0) {
                    reject(new UserNotFoundError());
                    return;
                }

                this.getUserByUsername(newUser.username).then((updatedUser: User) => {
                    resolve(updatedUser);
                }).catch((error: Error) => {
                    reject(error);
                });

            }.bind(this));
        } catch (error) {
            reject(error);
        }
    });
}

const setupDB = async () => {
    const sqlUser = "INSERT INTO users(username, name, surname, role) VALUES(?, ?, ?, ?)"
    

    await new Promise<void>((resolve, reject) => {
        try {
            db.run(sqlUser, [userToAdd.username, userToAdd.name, userToAdd.surname, userToAdd.role], (err) => {
                if (err) {
                    return reject(err);
                }
                resolve()
            });
        } catch (error) {
            reject(error);
        }

    });
}

describe('IUD - Integration DAO - DB', () => {

    beforeAll(async () => {
        await cleanupDB();
        await setupDB();
    });

    describe('IUD 1 - createUser',() =>{

        beforeEach(async () => {
            userDAO = new UserDAO;
        });

        it("IUD 1.1 - 200 OK - User successfully created", async () => {

            await expect(userDAO.createUser(userToAdd2.username,userToAdd2.name,userToAdd2.surname,userToAdd2.password,userToAdd2.role)).resolves.toBe(true);
        });

        it("IUD 1.2 - 409 KO - User already exists", async () => {

            await expect(userDAO.createUser(userToAdd.username,userToAdd.name,userToAdd.surname,userToAdd.password,userToAdd.role)).rejects.toThrowError(UserAlreadyExistsError)
        });

    })

    describe('IUD 2 - getUsers',() =>{

        beforeEach(async () => {
            userDAO = new UserDAO;
        })

        it("IUD 2.1 - 200 OK - Users successfully retrieved", async () => {

            const result = await userDAO.getUsers();
            expect(result[0].username).toBe(user.username);
            expect(result[0].name).toBe(user.name)
            expect(result[0].surname).toBe(user.surname)
            expect(result[0].address).toBe(null)
            expect(result[0].birthdate).toBe(null)
            expect(result[0].role).toBe(user.role)
        });
    })

    describe('IUD 3 - getUsersByRole',() =>{

        beforeEach(async () => {
            userDAO = new UserDAO;
        })
        it("IUD 3.1 - 200 OK - Users successfully retrieved by role", async () => {

            const result = await userDAO.getUsersByRole(user.role);
            expect(result[0].username).toBe(user.username);
            expect(result[0].name).toBe(user.name)
            expect(result[0].surname).toBe(user.surname)
            expect(result[0].address).toBe(null)
            expect(result[0].birthdate).toBe(null)
            expect(result[0].role).toBe(user.role)
        });

    })

    describe('IUD 4 - getUserByUsername',() =>{

        beforeEach(async () => {
            userDAO = new UserDAO;
        })
        it("IUD 4.1 - 200 OK - User successfully retrieved by username", async () => {

            const result = await userDAO.getUserByUsername(user.username);
            expect(result.username).toBe(user.username);
            expect(result.name).toBe(user.name)
            expect(result.surname).toBe(user.surname)
            expect(result.address).toBe(null)
            expect(result.birthdate).toBe(null)
            expect(result.role).toBe(user.role)
        });

    })
    describe('IUD 5 - updateUserInfo',() =>{
        

        beforeEach(async () => {
            userDAO = new UserDAO;
        })
        
        it("IUD 5.1 - 200 OK - User successfully updated", async () => {

            const result = await userDAO.updateUserInfo(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate)
            expect(result.username).toBe(newUser.username)
            expect(result.name).toBe(newUser.name)
            expect(result.surname).toBe(newUser.surname)
            expect(result.address).toBe(newUser.address)
            expect(result.birthdate).toBe(newUser.birthdate)
        });
        
        it("IUD 5.2 - 404 KO - User not found ", async () => {

            await expect(userDAO.updateUserInfo("aaaa",newUser.name,newUser.surname,newUser.address,newUser.birthdate)).rejects.toThrowError(new UserNotFoundError())
        });



    })

    describe('IUD 6 - deleteUser',() =>{

        beforeEach(async () => {
            userDAO = new UserDAO;
        })
        it("IUD 6.1 - 200 OK - User successfully deleted", async () => {

            await expect(userDAO.deleteUser(user.username)).resolves.toBe(true)
        });
        /*
        it("404 KO - User not found ", async () => {

            await expect(userDAO.deleteUser(user.username)).rejects.toThrowError(new UserNotFound())
        });*/



    })

    describe('IUD 7 - deleteAll',() =>{

        beforeEach(async () => {
            userDAO = new UserDAO;
        })
        it("IUD 7.1 - 200 OK - Users successfully deleted", async () => {

            await expect(userDAO.deleteAll()).resolves.toBe(true)
        });

    })

    

})

describe('IUC - Integration CONTROLLER - DAO - DB', () => {

    beforeAll(async () => {
        await cleanupDB();
        await setupDB();
    });

    describe("IUC 1 - createUser", () => {

        beforeEach(async () => {
            userController = new UserController();
            userDAO = userController.userDAO;
        });

        it("IUC 1.1 - 200 OK - Successful execution", async () => {
            
            const spyCreateUser = jest.spyOn(userDAO, "createUser"); //Mock the createUser method of the DAO
            await expect ( userController.createUser(userToAdd2.username,
                userToAdd2.name,
                userToAdd2.surname,
                userToAdd2.password,
                userToAdd2.role)).resolves.toBe(true)
            const controller = new UserController(); //Create a new instance of the controller
            //Call the createUser method of the controller with the test user object
            
            //Check if the createUser method of the DAO has been called once with the correct parameters
            expect(spyCreateUser).toHaveBeenCalledTimes(1);
            expect(spyCreateUser).toHaveBeenCalledWith(userToAdd2.username,
                userToAdd2.name,
                userToAdd2.surname,
                userToAdd2.password,
                userToAdd2.role);

            spyCreateUser.mockRestore();
        });

        it("IUC 1.2 - 409 KO - Username is already in DB", async () => {
            
            const spyCreateUser = jest.spyOn(userDAO, "createUser"); //Mock the createUser method of the DAO
            await expect ( userController.createUser(userToAdd2.username,
                userToAdd2.name,
                userToAdd2.surname,
                userToAdd2.password,
                userToAdd2.role)).rejects.toThrowError(new UserAlreadyExistsError)
            const controller = new UserController(); //Create a new instance of the controller
            //Call the createUser method of the controller with the test user object
            
            //Check if the createUser method of the DAO has been called once with the correct parameters
            expect(spyCreateUser).toHaveBeenCalledTimes(1);
            expect(spyCreateUser).toHaveBeenCalledWith(userToAdd2.username,
                userToAdd2.name,
                userToAdd2.surname,
                userToAdd2.password,
                userToAdd2.role);

            spyCreateUser.mockRestore();
        });
    })

    describe("IUC 2 - getUsers", () => {

        beforeEach(async () => {
            userController = new UserController();
            userDAO = userController.userDAO;
        });

        it("IUC 2.1 - 200 OK - Successful execution", async () => {
            const spyGetUsers = jest.spyOn(userDAO, "getUsers");
            const result = await userController.getUsers()
            expect(result[0].username).toBe(user.username);
            expect(result[0].name).toBe(user.name)
            expect(result[0].surname).toBe(user.surname)
            expect(result[0].address).toBe(null)
            expect(result[0].birthdate).toBe(null)
            expect(result[0].role).toBe(user.role)
            expect(result[1].username).toBe(manager.username);
            expect(result[1].name).toBe(manager.name)
            expect(result[1].surname).toBe(manager.surname)
            expect(result[1].address).toBe(null)
            expect(result[1].birthdate).toBe(null)
            expect(result[1].role).toBe(manager.role)
        
            expect(spyGetUsers).toHaveBeenCalledTimes(1);
            expect(spyGetUsers).toHaveBeenCalledWith();
            spyGetUsers.mockRestore();
        });
    })

    describe("IUC 3 - getUserByRole", () => {

        beforeEach(async () => {
            userController = new UserController();
            userDAO = userController.userDAO;
        });
        it("IUC 3.1 - 200 OK - Successful execution", async () => {
            const spyGetUsersByRole = jest.spyOn(userDAO, "getUsersByRole");
            let role = "Manager"
            const result = await userController.getUsersByRole(role)
            expect(result[0].username).toBe(manager.username);
            expect(result[0].name).toBe(manager.name)
            expect(result[0].surname).toBe(manager.surname)
            expect(result[0].address).toBe(null)
            expect(result[0].birthdate).toBe(null)
            expect(result[0].role).toBe(manager.role)
        
            expect(spyGetUsersByRole).toHaveBeenCalledTimes(1);
            expect(spyGetUsersByRole).toHaveBeenCalledWith(role);
            spyGetUsersByRole.mockRestore();
        });

    })

    describe("IUC 4 - getUserByUsername", () => {

        beforeEach(async () => {
            userController = new UserController();
            userDAO = userController.userDAO;
        });
        it("IUC 4.1 - 200 OK - Successful execution for customer", async () => {
            const spyGetUserByUsername = jest.spyOn(userDAO, "getUserByUsername");
            let username = "MarioRossi"
            const result = await userController.getUserByUsername(user,username)
            expect(result.username).toBe(user.username);
            expect(result.name).toBe(user.name)
            expect(result.surname).toBe(user.surname)
            expect(result.address).toBe(null)
            expect(result.birthdate).toBe(null)
            expect(result.role).toBe(user.role)
        
            expect(spyGetUserByUsername).toHaveBeenCalledTimes(1);
            expect(spyGetUserByUsername).toHaveBeenCalledWith(username);
            spyGetUserByUsername.mockRestore();
        });

        it("IUC 4.2 - 200 OK - Successful execution for admin", async () => {
            const spyGetUserByUsername = jest.spyOn(userDAO, "getUserByUsername");
            let username = "LuigiVerdi"
            const result = await userController.getUserByUsername(admin,username)
            expect(result.username).toBe(manager.username);
            expect(result.name).toBe(manager.name)
            expect(result.surname).toBe(manager.surname)
            expect(result.address).toBe(null)
            expect(result.birthdate).toBe(null)
            expect(result.role).toBe(manager.role)
        
            expect(spyGetUserByUsername).toHaveBeenCalledTimes(1);
            expect(spyGetUserByUsername).toHaveBeenCalledWith(username);
            spyGetUserByUsername.mockRestore();
        });

        it("IUC 4.3 - 404 KO - User does not exist", async () => {
            const spyGetUserByUsername = jest.spyOn(userDAO, "getUserByUsername") 
            await expect(userController.getUserByUsername(admin ,"test")).rejects.toThrowError(UserNotFoundError)
            expect(spyGetUserByUsername).toHaveBeenCalledTimes(1);
            expect(spyGetUserByUsername).toHaveBeenCalledWith("test");
        });

        it("IUC 4.4 - 401 KO - Username does not belong to the non-Admin User", async () => {
            const spyGetUserByUsername = jest.spyOn(userDAO, "getUserByUsername") 
            await expect(userController.getUserByUsername(user ,manager.username)).rejects.toThrowError(UnauthorizedUserError)
            expect(spyGetUserByUsername).toHaveBeenCalledTimes(0);
            //expect(spyGetUserByUsername).toHaveBeenCalledWith(manager.username);
        });
    })

    describe("IUC 5 - updateUserInfo", ()=>{
    
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("IUC 5.1 - 200 OK - Successful execution for non-Admin User", async () => {
            
            const spyUpdateUserInfo = jest.spyOn(userDAO, "updateUserInfo") //Mock the createUser method of the DAO
            
            const response2 = await userController.getValidDate(newUser.birthdate);
            const response = await userController.updateUserInfo(user,newUser.name,newUser.surname,newUser.address,newUser.birthdate,user.username);
            expect(spyUpdateUserInfo).toHaveBeenCalledTimes(1);
            expect(spyUpdateUserInfo).toHaveBeenCalledWith(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate);
            
            expect(response).toEqual(newUser); //Check if the response is true
            expect(response2).toEqual(newUser.birthdate); //Check if the response is true
        });

        it("IUC 5.2 - 200 OK - Successful execution for Admin", async () => {
            
            const spyUpdateUserInfo = jest.spyOn(userDAO, "updateUserInfo") //Mock the createUser method of the DAO
            //const response3 = await userController.getUserByUsername(manager,manager.username);
            
            const response2 = await userController.getValidDate(newUser2.birthdate);
            const response = await userController.updateUserInfo(admin,newUser2.name,newUser2.surname,newUser2.address,newUser2.birthdate,manager.username);
            expect(userDAO.getUserByUsername).toHaveBeenCalledTimes(2);
            expect(userDAO.getUserByUsername).toHaveBeenCalledWith(manager.username);
            
            expect(spyUpdateUserInfo).toHaveBeenCalledTimes(1);
            expect(spyUpdateUserInfo).toHaveBeenCalledWith(manager.username,newUser2.name,newUser2.surname,newUser2.address,newUser2.birthdate);
            expect(response).toEqual(newUser2); //Check if the response is true
            expect(response2).toEqual(newUser2.birthdate); //Check if the response is true
            //expect(response3).toEqual(manager)
        });

        it("IUC 5.3 - 200 OK - Successful execution but nothing to be updated", async () => {
            
            const spyUpdateUserInfo = jest.spyOn(userDAO, "updateUserInfo") //Mock the createUser method of the DAO
            
            const response2 = await userController.getValidDate(newUser.birthdate);
            const response = await userController.updateUserInfo(user,newUser.name,newUser.surname,newUser.address,newUser.birthdate,user.username);
            expect(spyUpdateUserInfo).toHaveBeenCalledTimes(1);
            expect(spyUpdateUserInfo).toHaveBeenCalledWith(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate);
            
            expect(response).toEqual(newUser); //Check if the response is true
            expect(response2).toEqual(newUser.birthdate); //Check if the response is true
        });

        it("IUC 5.4 - 404 KO - User not found", async () => {
            const spyUpdateUserInfo = jest.spyOn(userDAO, "updateUserInfo") //Mock the createUser method of the DAO
            const response2 = await userController.getValidDate(newUser2.birthdate);
            await expect (userController.updateUserInfo(admin,newUser2.name,newUser2.surname,newUser2.address,newUser2.birthdate,"testtt")).rejects.toThrowError(UserNotFoundError);
            expect(userDAO.getUserByUsername).toHaveBeenCalledTimes(1);
            expect(userDAO.getUserByUsername).toHaveBeenCalledWith("testtt");
            
            expect(spyUpdateUserInfo).toHaveBeenCalledTimes(0);
            //expect(spyUpdateUserInfo).toHaveBeenCalledWith(manager.username,newUser2.name,newUser2.surname,newUser2.address,newUser2.birthdate);
            expect(response2).toEqual(newUser2.birthdate); //Check if the response is true
            //expect(response3).toEqual(manager)
            
        });

        it("IUC 5.5 - 401 KO - Admin is trying to delete another admin", async () => {
            let admin2 = new User("admin2","NameAdmin2","SurnameAdmin2",Role.ADMIN,"","1980-01-01")
            await userController.createUser(admin2.username,admin2.name,admin2.surname,"aaaaa",Role.ADMIN)
            const spyUpdateUserInfo = jest.spyOn(userDAO, "updateUserInfo") //Mock the createUser method of the DAO
            const response2 = await userController.getValidDate(admin2.birthdate);
            await expect (userController.updateUserInfo(admin,admin2.name,admin2.surname,admin2.address,admin2.birthdate,admin2.username)).rejects.toThrowError(UserIsAdminError);
            expect(userDAO.getUserByUsername).toHaveBeenCalledTimes(1);
            expect(userDAO.getUserByUsername).toHaveBeenCalledWith(admin2.username);
            
            expect(spyUpdateUserInfo).toHaveBeenCalledTimes(0);
            //expect(spyUpdateUserInfo).toHaveBeenCalledWith(manager.username,newUser2.name,newUser2.surname,newUser2.address,newUser2.birthdate);
            expect(response2).toEqual(admin2.birthdate); //Check if the response is true
            //expect(response3).toEqual(manager)
            
        });

        it("IUC 5.6 - 400 KO - Birthdate is after the current date", async () => {
            
            const spyUpdateUserInfo = jest.spyOn(userDAO, "updateUserInfo") //Mock the createUser method of the DAO
            
            //const response2 = await userController.getValidDate("2099-01-01");
            await expect (userController.updateUserInfo(user,newUser.name,newUser.surname,newUser.address,"2099-01-01",user.username)).rejects.toThrowError(DateError)
            expect(spyUpdateUserInfo).toHaveBeenCalledTimes(0);
            //expect(spyUpdateUserInfo).toHaveBeenCalledWith(user.username,newUser.name,newUser.surname,newUser.address,"2099-01-01");
            
            //expect(response).toEqual(newUser); //Check if the response is true
            //expect(response2).toEqual(newUser.birthdate); //Check if the response is true
        });
    })

    describe("IUC 6 - deleteUser", ()=>{
    
        beforeEach(() => {
            jest.clearAllMocks();
        });
        it("IUC 6.1 - 200 OK - Successful execution for Admin", async () => {
            const spyGetUserByUsername = jest.spyOn(userDAO, "getUserByUsername") 
            const spyDeleteCustomer = jest.spyOn(userDAO, "deleteUser")
            const response = await userController.deleteUser(admin,user.username);
            expect(spyGetUserByUsername).toHaveBeenCalledTimes(1);
            expect(spyGetUserByUsername).toHaveBeenCalledWith(user.username);
            expect(spyDeleteCustomer).toHaveBeenCalledTimes(1);
            expect(spyDeleteCustomer).toHaveBeenCalledWith(user.username);
            expect(response).toBe(true); //Check if the response is true
        });

        it("IUC 6.2 - 200 OK - Successful execution for non-Admin User", async () => {
            const spyDeleteCustomer = jest.spyOn(userDAO, "deleteUser")
            const response = await userController.deleteUser(manager,manager.username);
            expect(spyDeleteCustomer).toHaveBeenCalledTimes(1);
            expect(spyDeleteCustomer).toHaveBeenCalledWith(manager.username);
            expect(response).toBe(true); //Check if the response is true
        });

        it("IUC 6.3 - 404 KO - User not found ", async () => {
            const spyGetUserByUsername = jest.spyOn(userDAO, "getUserByUsername") 
            const spyDeleteCustomer = jest.spyOn(userDAO, "deleteUser")
            await expect (userController.deleteUser(admin,user.username)).rejects.toThrowError(UserNotFoundError)
            expect(spyGetUserByUsername).toHaveBeenCalledTimes(1);
            expect(spyGetUserByUsername).toHaveBeenCalledWith(user.username);
            expect(spyDeleteCustomer).toHaveBeenCalledTimes(0);
            //expect(spyDeleteCustomer).toHaveBeenCalledWith(user.username);
            //expect(response).toBe(true); //Check if the response is true
        });

        it("IUC 6.4 - 401 KO - Username does not belong to User", async () => {
            const spyGetUserByUsername = jest.spyOn(userDAO, "getUserByUsername") 
            const spyDeleteCustomer = jest.spyOn(userDAO, "deleteUser")
            await expect (userController.deleteUser(user,manager.username)).rejects.toThrowError(UserNotAdminError)
            expect(spyGetUserByUsername).toHaveBeenCalledTimes(0);
            expect(spyDeleteCustomer).toHaveBeenCalledTimes(0);
            //expect(response).toBe(true); //Check if the response is true
        });

        it("IUC 6.5 - 401 KO - Admin is trying to delete another Admin", async () => {
            let admin2 = new User("admin2","NameAdmin2","SurnameAdmin2",Role.ADMIN,"","")
            //await userController.createUser(admin2.username,admin2.name,admin2.surname,"test",Role.ADMIN)
            const spyGetUserByUsername = jest.spyOn(userDAO, "getUserByUsername") 
            const spyDeleteCustomer = jest.spyOn(userDAO, "deleteUser")
            await expect (userController.deleteUser(admin,admin2.username)).rejects.toThrowError(UserIsAdminError)
            expect(spyGetUserByUsername).toHaveBeenCalledTimes(1);
            expect(spyDeleteCustomer).toHaveBeenCalledTimes(0);
            //expect(response).toBe(true); //Check if the response is true
        });

        
        

    })

    describe("IUC 7 - deleteAll", ()=>{
    
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("IUC 7.1 - 200 OK - Successful execution for Admin", async () => {
           const spyDeleteAll = jest.spyOn(userDAO, "deleteAll")
            const response = await userController.deleteAll();
            expect(spyDeleteAll).toHaveBeenCalledTimes(1);
            expect(spyDeleteAll).toHaveBeenCalledWith();
            expect(response).toBe(true); //Check if the response is true
        });


    })
        
})

describe('Integration ROUTES - CONTROLLER - DAO - DB', () => {
    const baseURL = "/ezelectronics"
    let adminCookie: string;
    let managerCookie: string;
    let customerCookie: string;

    const postUser = async (userInfo: any) => {
        await request(app)
            .post("/ezelectronics/users")
            .send(userInfo)
            .expect(200);
    };

    const login = async (userInfo: any): Promise<string> => {
        return new Promise<string>((resolve, reject) => {
            request(app)
                .post("/ezelectronics/sessions")
                .send(userInfo)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.header["set-cookie"][0]);
                    }
                });
        });
    };

    beforeAll(async () => {
        await cleanupDB();
        await postUser(userToAdd3);
        await postUser(userToAdd);
        adminCookie = await login(userToAdd3);
        //managerCookie = await login(userToAdd2);
        customerCookie = await login(userToAdd);
    });

    describe("IUR 1 - POST /ezelectronics/users", () => {

        beforeEach(() => {
            jest.clearAllMocks();
            jest.resetAllMocks();
        });

        it("IUR 1.1 - 200 OK - User successfully created", async () => {
            
            //const spyLogin = await request(app).post(baseURL + "/sessions").send(userToLog)
            const response = await request(app).post(baseURL + "/users").send(userToAdd2) 
            const spyCreateUser = jest.spyOn(userController, "createUser")
            expect(response.status).toBe(200)
            
            managerCookie = await login(userToAdd2);
        })

        it("IUR 1.2.1 - 422 KO - Username is empty", async () => {
            const testUser = { //Define a test user object sent to the route
                username: "",
                name: "test",
                surname: "test",
                password: "test",
                role: "Manager"
            }
            const response = await request(app).post(baseURL + "/users").send(testUser)
            expect(response.status).toBe(422)
        })

        it("IUR 1.2.2 - 422 KO - Name is empty", async () => {
            const testUser = { //Define a test user object sent to the route
                username: "test",
                name: "",
                surname: "test",
                password: "test",
                role: "Manager"
            }
            const response = await request(app).post(baseURL + "/users").send(testUser)
            expect(response.status).toBe(422)
        })

        it("IUR 1.2.3 - 422 KO - Surname is empty", async () => {
            const testUser = { //Define a test user object sent to the route
                username: "test",
                name: "test",
                surname: "",
                password: "test",
                role: "Manager"
            }
            const response = await request(app).post(baseURL + "/users").send(testUser)
            expect(response.status).toBe(422)
        })

        it("IUR 1.2.4 - 422 KO - Password is empty", async () => {
            const testUser = { //Define a test user object sent to the route
                username: "",
                name: "test",
                surname: "test",
                password: "test",
                role: "Manager"
            }
            const response = await request(app).post(baseURL + "/users").send(testUser)
            expect(response.status).toBe(422)
        })

        it("IUR 1.2.5 - 422 KO - Role is not valid", async () => {
            const testUser = { //Define a test user object sent to the route
                username: "",
                name: "test",
                surname: "test",
                password: "test",
                role: "Manager"
            }
            const response = await request(app).post(baseURL + "/users").send(testUser)
            expect(response.status).toBe(422)
        })

        it("IUR 1.2.1 - 422 OK - Username is empty", async () => {
            const testUser = { //Define a test user object sent to the route
                username: "",
                name: "test",
                surname: "test",
                password: "test",
                role: "Manager"
            }
            const response = await request(app).post(baseURL + "/users").send(testUser)
            expect(response.status).toBe(422)
        })

        it("IUR 1.3 - 409 OK - Username already exists", async () => {
            
            //const spyLogin = await request(app).post(baseURL + "/sessions").send(userToLog)
            const response = await request(app).post(baseURL + "/users").send(userToAdd2) 
            //const spyCreateUser = jest.spyOn(userController, "createUser")
            expect(response.status).toBe(409)
        })
    })

    describe("IUR 2 - GET /ezelectronics/users", () => {


        beforeEach(() => {
            jest.clearAllMocks();
            jest.resetAllMocks();
        });

        test("IUR 2.1 - 200 OK - Users succesfully returned", async () => {
            const response = await request(app).get(baseURL + "/users").set("Cookie", adminCookie); 
             expect(response.status).toBe(200) //Check if the response status is 200
        })

        test("IUR 2.2 - 401 KO - Users is not an admin", async () => {
            const response = await request(app).get(baseURL + "/users").set("Cookie", customerCookie); 
             expect(response.status).toBe(401)
            })
    })

    describe("IUR 3 - GET /ezelectronics/users/roles/:role", () => {
        test("IUR 3.1 - 200 OK - Users succesfully returned by role", async () => {
            let role = "Customer"
            const response = await request(app).get(`${baseURL}/users/roles/${role}`).set("Cookie", adminCookie); 
            expect(response.status).toBe(200)
        })
    

        test("IUR 3.2 - 401 KO - User is not an Admin", async () => {
            let role = "Customer"
            const response = await request(app).get(`${baseURL}/users/roles/${role}`).set("Cookie", customerCookie); 
            expect(response.status).toBe(401)
        })

    })

    describe("IUR 4 - GET /ezelectronics/users/:username", () => {
        test("IUR 4.1 - 200 OK - User succesfully returned by username (Customer)", async () => {
            const response = await request(app).get(`${baseURL}/users/${user.username}`).set("Cookie", customerCookie)
            expect(response.status).toBe(200)
        })

        test("IUR 4.2 - 200 OK - User succesfully returned by username (Admin)", async () => {
            const response = await request(app).get(`${baseURL}/users/${user.username}`).set("Cookie", adminCookie)
        
            expect(response.status).toBe(200)
        })

        test("IUR 4.3 - 401 KO - User is not an Admin", async () => {
            const response = await request(app).get(`${baseURL}/users/${manager.username}`).set("Cookie", customerCookie)
        
            expect(response.status).toBe(401)
        })

        test("IUR 4.4 - 404 KO - User does not exist in database", async () => {
            const response = await request(app).get(`${baseURL}/users/${"testtt"}`).set("Cookie", adminCookie)
        
            expect(response.status).toBe(404)
        })
    })  
    describe("IUR 5 - PATCH /ezelectronics/users/:username", () => {

    
        test("IUR 5.1 - 200 OK - User succesfully updated (Customer)", async () => {
            const response = await request(app).patch(`${baseURL}/users/${newUser.username}`).send(newUser).set("Cookie", customerCookie)
        
            expect(response.status).toBe(200)
        })

        test("IUR 5.1 - 200 OK - User succesfully updated (Customer)", async () => {
            const response = await request(app).patch(`${baseURL}/users/${newUser.username}`).send(newUser).set("Cookie", adminCookie)
        
            expect(response.status).toBe(200)
        })

        test("IUR 5.3 - 404 KO - User not found", async () => {
            const response = await request(app).patch(`${baseURL}/users/${"testtt"}`).send(newUser).set("Cookie", adminCookie)
        
            expect(response.status).toBe(404)
        })

        test("IUR 5.4 - 401 KO - Username doesn't match logged user and is not Admin", async () => {
            const response = await request(app).patch(`${baseURL}/users/${"testtt"}`).send(newUser).set("Cookie", customerCookie)
        
            expect(response.status).toBe(401)
        })
        test("IUR 5.5 - 400 KO - User birthdate is after current date", async () => {
            const newnewUser = { //Define a test user object sent to the route
                username: "MarioRossi",
                name: "newName",
                surname: "newSurname",
                role: "Customer",
                address: "Torino, Via Madama Cristina 27",
                birthdate:"2099-01-01"
            }
            const response = await request(app).patch(`${baseURL}/users/${newnewUser.username}`).send(newnewUser).set("Cookie", customerCookie)
        
            expect(response.status).toBe(400)
        })

        test("IUR 5.6.1 - 422 KO - Name is empty", async () => {
            const newnewUser = { 
                username: "test",
                name: "",
                surname: "newSurname",
                role: "Customer",
                address: "Torino, Via Madama Cristina 27",
                birthdate:"1980-01-01"
            }
            const response = await request(app).patch(`${baseURL}/users/${"testtt"}`).send(newnewUser).set("Cookie", customerCookie)
        
            expect(response.status).toBe(422)
        })

        test("IUR 5.6.2 - 422 KO - Surname is empty", async () => {
            const newnewUser = { 
                username: "test",
                name: "newName",
                surname: "",
                role: "Customer",
                address: "Torino, Via Madama Cristina 27",
                birthdate:"1980-01-01"
            }
            const response = await request(app).patch(`${baseURL}/users/${"testtt"}`).send(newnewUser).set("Cookie", customerCookie)
        
            expect(response.status).toBe(422)
        })

        test("IUR 5.6.3 - 422 KO - Address is empty", async () => {
            const newnewUser = { 
                username: "test",
                name: "newName",
                surname: "newSurname",
                role: "Customer",
                address: "",
                birthdate:"1980-01-01"
            }
            const response = await request(app).patch(`${baseURL}/users/${"testtt"}`).send(newnewUser).set("Cookie", customerCookie)
        
            expect(response.status).toBe(422)
        })

        test("IUR 5.6.4 - 422 KO - Birthdate is empty", async () => {
            const newnewUser = { 
                username: "test",
                name: "newName",
                surname: "newSurname",
                role: "Customer",
                address: "Torino",
                birthdate:""
            }
            const response = await request(app).patch(`${baseURL}/users/${"testtt"}`).send(newnewUser).set("Cookie", customerCookie)
        
            expect(response.status).toBe(422)
        })
    })

    describe("IUR 6 - DELETE /ezelectronics/users/:username", () => {
        test("IUR 6.1 - 200 OK - User succesfully returned by username (Customer)", async () => {
            const response = await request(app).delete(`${baseURL}/users/${user.username}`).set("Cookie", customerCookie)
        
            expect(response.status).toBe(200)
        })

        test("IUR 6.1 - 200 OK - User succesfully returned by username (Customer)", async () => {
            const response = await request(app).delete(`${baseURL}/users/${manager.username}`).set("Cookie", adminCookie) 
            expect(response.status).toBe(200)
        })

        test("IUR 6.2 - 401 KO - User is not an Admin", async () => {
            const response = await request(app).delete(`${baseURL}/users/${manager.username}`).set("Cookie", customerCookie) 
        
            expect(response.status).toBe(401)
        })

        test("IUR 6.3 - 401 KO - Admin is trying to delete another Admin", async () => {
            const admin2 = { 
                username: "test",
                name: "newName",
                surname: "newSurname",
                
                password: "test",
                role: "Customer"
            }
            await postUser(admin2)
            const response = await request(app).delete(`${baseURL}/users/${admin2.username}`).set("Cookie", customerCookie) 
        
            expect(response.status).toBe(401)
        })

        test("IUR 6.4 - 404 KO - User does not exist in database", async () => {
            const response = await request(app).get(`${baseURL}/users/${"testtt"}`).set("Cookie", adminCookie) 
        
            expect(response.status).toBe(404)
        })

        
    })

    describe("IUR 7 - DELETE /ezelectronics/users/", () => {
        test("IUR 7.1 - 200 OK - Users succesfully deleted", async () => {
            const response = await request(app).delete(`${baseURL}/users`).set("Cookie", adminCookie) 
        
            expect(response.status).toBe(200)
        })

        test("IUR 7.2 - 401 KO - User is not Admin", async () => {
            const response = await request(app).delete(`${baseURL}/users`).set("Cookie", customerCookie) 
        
            expect(response.status).toBe(401)
        })
    })
})
