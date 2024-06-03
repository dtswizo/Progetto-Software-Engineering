import { test, expect, jest } from "@jest/globals"
import UserController from "../../src/controllers/userController"
import UserDAO from "../../src/dao/userDAO"
import { Role, User } from "../../src/components/user";
import { UnauthorizedUserError, UserAlreadyExistsError, UserIsAdminError, UserNotAdminError, UserNotFoundError } from "../../src/errors/userError";

jest.mock("../../src/dao/userDAO")

//Example of a unit test for the createUser method of the UserController
//The test checks if the method returns true when the DAO method returns true
//The test also expects the DAO method to be called once with the correct parameters
describe("createUser", ()=>{
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

test("200 OK - Successful execution", async () => {
    const testUser = { //Define a test user object
        username: "test",
        name: "test",
        surname: "test",
        password: "test",
        role: "Manager"
    }
    jest.spyOn(UserDAO.prototype, "createUser").mockResolvedValueOnce(true); //Mock the createUser method of the DAO
    const controller = new UserController(); //Create a new instance of the controller
    //Call the createUser method of the controller with the test user object
    const response = await controller.createUser(testUser.username, testUser.name, testUser.surname, testUser.password, testUser.role);

    //Check if the createUser method of the DAO has been called once with the correct parameters
    expect(UserDAO.prototype.createUser).toHaveBeenCalledTimes(1);
    expect(UserDAO.prototype.createUser).toHaveBeenCalledWith(testUser.username,
        testUser.name,
        testUser.surname,
        testUser.password,
        testUser.role);
    expect(response).toBe(true); //Check if the response is true
});

test("409 KO UserAlreadyExistsError - Already exisiting user", async () => {
    const testUser = { //Define a test user object
        username: "test",
        name: "test",
        surname: "test",
        password: "test",
        role: "Manager"
    }
    jest.spyOn(UserDAO.prototype, "createUser").mockRejectedValueOnce(new UserAlreadyExistsError()); //Mock the createUser method of the DAO
    const controller = new UserController(); //Create a new instance of the controller
    //Call the createUser method of the controller with the test user object
    await expect(controller.createUser(testUser.username, testUser.name, testUser.surname, testUser.password, testUser.role)).rejects.toThrowError(UserAlreadyExistsError);

    //Check if the createUser method of the DAO has been called once with the correct parameters
    expect(UserDAO.prototype.createUser).toHaveBeenCalledTimes(1);
    expect(UserDAO.prototype.createUser).toHaveBeenCalledWith(testUser.username,
        testUser.name,
        testUser.surname,
        testUser.password,
        testUser.role);
});
});

describe("getUsers", ()=>{
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("200 OK - Successful execution", async () => {
        let users = [new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"",""),
        new User ("manager","NameManager","SurnameManager",Role.MANAGER,"",""),
        ]
        jest.spyOn(UserDAO.prototype, "getUsers").mockResolvedValueOnce(users); //Mock the createUser method of the DAO
        const controller = new UserController(); 
        const response = await controller.getUsers();
    
        expect(UserDAO.prototype.getUsers).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUsers).toHaveBeenCalledWith();
        expect(response).toBe(users); //Check if the response is true
    });
})

describe("getUsersByRole", ()=>{
    
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    test("200 OK - Successful execution", async () => {
        let users = [new User ("manager2","NameManager2","SurnameManager2",Role.MANAGER,"",""),
        new User ("manager","NameManager","SurnameManager",Role.MANAGER,"",""),
        ]
        let role="Manager"
        jest.spyOn(UserDAO.prototype, "getUsersByRole").mockResolvedValueOnce(users); //Mock the createUser method of the DAO
        const controller = new UserController(); 
        const response = await controller.getUsersByRole(role);
    
        expect(UserDAO.prototype.getUsersByRole).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUsersByRole).toHaveBeenCalledWith(role);
        expect(response).toBe(users); //Check if the response is true
    });
})

describe("getUserByUsername", ()=>{
    
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    test("200 OK - Successful execution for Customer", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockResolvedValueOnce(user); //Mock the createUser method of the DAO
        const controller = new UserController(); 
        const response = await controller.getUserByUsername(user ,user.username);
    
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(user.username);
        expect(response).toBe(user); //Check if the response is true
    });

    //Effettuo caso successful anche per admin
    test("200 OK - Successful execution for Admin", async () => {
        let admin = new User("admin","NameAdmin","SurnameAdmin",Role.ADMIN,"","")
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockResolvedValueOnce(user); //Mock the createUser method of the DAO
        const controller = new UserController(); 
        const response = await controller.getUserByUsername(admin ,user.username);
    
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(user.username);
        expect(response).toBe(user); //Check if the response is true
    });

    test("404 KO - User does not exist", async () => {
        let admin = new User("admin","NameAdmin","SurnameAdmin",Role.ADMIN,"","")
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockRejectedValue(new UserNotFoundError()); //Mock the createUser method of the DAO
        const controller = new UserController(); 
        await expect(controller.getUserByUsername(admin ,user.username)).rejects.toThrowError(UserNotFoundError)
    
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(user.username);
    });

    test("401 KO - Username does not belong to the non-Admin User", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        let user2 = new User ("customer2","NameCustomer2","SurnameCustomer2",Role.CUSTOMER,"","")
        
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockRejectedValue(new UnauthorizedUserError()); //Mock the createUser method of the DAO
        const controller = new UserController(); 
        await expect(controller.getUserByUsername(user ,user2.username)).rejects.toThrowError(UnauthorizedUserError)
    
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(0);
    });
})

describe("deleteUser", ()=>{
    
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test("200 OK - Successful execution for Admin", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        let admin = new User("admin","NameAdmin","SurnameAdmin",Role.ADMIN,"","")
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockResolvedValueOnce(user); //Mock the createUser method of the DAO
        
        jest.spyOn(UserDAO.prototype, "deleteUser").mockResolvedValueOnce(true); //Mock the createUser method of the DAO
        const controller = new UserController(); 
        const response = await controller.deleteUser(admin,user.username);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(user.username);
        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledWith(user.username);
        expect(response).toBe(true); //Check if the response is true
    });

    test("200 OK - Successful execution for non-Admin User", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        
        jest.spyOn(UserDAO.prototype, "deleteUser").mockResolvedValueOnce(true); //Mock the createUser method of the DAO
        const controller = new UserController(); 
        const response = await controller.deleteUser(user,user.username);
        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledWith(user.username);
        expect(response).toBe(true); //Check if the response is true
    });

    test("404 KO - User does not exist", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        let admin = new User("admin","NameAdmin","SurnameAdmin",Role.ADMIN,"","")
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockRejectedValue(new UserNotFoundError()); //Mock the createUser method of the DAO
        
        const controller = new UserController(); 
        await expect(controller.deleteUser(admin ,user.username)).rejects.toThrowError(UserNotFoundError)
    
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(user.username);
        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledTimes(0);
    });

    test("401 KO - Username does not belong to User", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        let user2 = new User ("customer2","NameCustomer2","SurnameCustomer2",Role.CUSTOMER,"","")
        
        //jest.spyOn(UserDAO.prototype, "getUserByUsername").mockRejectedValue(new UserNotAdminError()); //Mock the createUser method of the DAO
        
        const controller = new UserController(); 
        await expect(controller.deleteUser(user ,user2.username)).rejects.toThrowError(UserNotAdminError)
    
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(0);
        //expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(user.username);
        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledTimes(0);
    });

    test("401 KO - Admin is trying to delete another Admin", async () => {
        let admin = new User("admin","NameAdmin","SurnameAdmin",Role.ADMIN,"","")
        let admin2 = new User("admin2","NameAdmin2","SurnameAdmin2",Role.ADMIN,"","")
        
        //jest.spyOn(UserDAO.prototype, "getUserByUsername").mockRejectedValue(new UserNotAdminError()); //Mock the createUser method of the DAO
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockResolvedValueOnce(admin2); //Mock the createUser method of the DAO
        
        const controller = new UserController(); 
        await expect(controller.deleteUser(admin ,admin2.username)).rejects.toThrowError(UserIsAdminError)
    
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(admin2.username);
        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledTimes(0);
    });

})

describe("deleteAll", ()=>{
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("200 OK - Successful execution", async () => {
        jest.spyOn(UserDAO.prototype, "deleteAll").mockResolvedValue(true); //Mock the createUser method of the DAO
        const controller = new UserController(); 
        const response = await controller.deleteAll();
        expect(UserDAO.prototype.deleteAll).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.deleteAll).toHaveBeenCalledWith();
        expect(response).toBe(true); //Check if the response is true
    });
})


describe("updateUserInfo", ()=>{
    
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test("200 OK - Successful execution for non-Admin User", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        let newUser = new User("customer","newName","newSurname",Role.CUSTOMER,"Torino, Via Madama Cristina 27","1980-01-01")
        //jest.spyOn(UserDAO.prototype, "getUserByUsername").mockResolvedValueOnce(user); //Mock the createUser method of the DAO
        
        jest.spyOn(UserDAO.prototype, "updateUserInfo").mockResolvedValue(newUser); //Mock the createUser method of the DAO
        
        const controller = new UserController(); 
        const response2 = await controller.getValidDate(newUser.birthdate);
        
        const response = await controller.updateUserInfo(user,newUser.name,newUser.surname,newUser.address,newUser.birthdate,user.username);
        //expect(UserController.prototype.getUserByUsername).toHaveBeenCalledTimes(1)
        //expect(UserController.prototype.getUserByUsername).toHaveBeenCalledWith(user.username)
        //expect(UserController.prototype.getValidDate).toHaveBeenCalledTimes(1)
        //expect(UserController.prototype.getValidDate).toHaveBeenCalledWith(newUser.birthdate)
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate);
        expect(response).toBe(newUser); //Check if the response is true
        expect(response2).toBe(newUser.birthdate); //Check if the response is true
    });

    test("200 OK - Successful execution for Admin ", async () => {
        let admin = new User("admin","NameAdmin","SurnameAdmin",Role.ADMIN,"Corso Duca degli Abruzzi 129, Torino","")
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        
        let newUser = new User("customer","newName","newSurname",Role.CUSTOMER,"Torino, Via Madama Cristina 27","1980-01-01")
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockResolvedValue(user); //Mock the createUser method of the DAO
        
        jest.spyOn(UserDAO.prototype, "updateUserInfo").mockResolvedValue(newUser); //Mock the createUser method of the DAO
        
        const controller = new UserController(); 
        const response2 = await controller.getValidDate(newUser.birthdate);
        
        const response = await controller.updateUserInfo(admin,newUser.name,newUser.surname,newUser.address,newUser.birthdate,user.username);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1)
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(user.username)
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate);
        expect(response).toBe(newUser); //Check if the response is true
        expect(response2).toBe(newUser.birthdate); //Check if the response is true
    });

    test("404 KO - User not found ", async () => {
        let admin = new User("admin","NameAdmin","SurnameAdmin",Role.ADMIN,"Corso Duca degli Abruzzi 129, Torino","")
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        
        let newUser = new User("customer","newName","newSurname",Role.CUSTOMER,"Torino, Via Madama Cristina 27","1980-01-01")
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockRejectedValue(new UserNotFoundError()); //Mock the createUser method of the DAO
        
        jest.spyOn(UserDAO.prototype, "updateUserInfo").mockResolvedValue(newUser); //Mock the createUser method of the DAO
        
        const controller = new UserController(); 
        const response2 = await controller.getValidDate(newUser.birthdate);
        
        await expect(controller.updateUserInfo(admin,newUser.name,newUser.surname,newUser.address,newUser.birthdate,user.username)).rejects.toThrowError(UserNotFoundError);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1)
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(user.username)
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledTimes(0);
        //expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate);
        expect(response2).toBe(newUser.birthdate); //Check if the response is true
    });

    //Errore di admin che non può modificare admin?
    test("401 KO -  ", async () => {
        let admin = new User("admin","NameAdmin","SurnameAdmin",Role.ADMIN,"Corso Duca degli Abruzzi 129, Torino","")
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"","")
        
        let newUser = new User("customer","newName","newSurname",Role.CUSTOMER,"Torino, Via Madama Cristina 27","1980-01-01")
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockRejectedValue(new UserNotFoundError()); //Mock the createUser method of the DAO
        
        jest.spyOn(UserDAO.prototype, "updateUserInfo").mockResolvedValue(newUser); //Mock the createUser method of the DAO
        
        const controller = new UserController(); 
        const response2 = await controller.getValidDate(newUser.birthdate);
        
        await expect(controller.updateUserInfo(admin,newUser.name,newUser.surname,newUser.address,newUser.birthdate,user.username)).rejects.toThrowError(UserNotFoundError);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1)
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(user.username)
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledTimes(0);
        //expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate);
        expect(response2).toBe(newUser.birthdate); //Check if the response is true
    });

})
