import { describe, test, expect, beforeAll, afterAll, jest } from "@jest/globals"

import UserController from "../../src/controllers/userController"
import UserDAO from "../../src/dao/userDAO"
import crypto from "crypto"
import db from "../../src/db/db"
import { Database } from "sqlite3"
import { UserAlreadyExistsError, UserNotFoundError } from "../../src/errors/userError"
import { Role, User } from "../../src/components/user"

jest.mock("crypto")
jest.mock("../../src/db/db.ts")

const userDAO = new UserDAO()

//Example of unit test for the createUser method
//It mocks the database run method to simulate a successful insertion and the crypto randomBytes and scrypt methods to simulate the hashing of the password
//It then calls the createUser method and expects it to resolve true

describe("createUser", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });


    test("200 OK - User created correctly", async () => {
        
        const mockDBRun = jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback(null)
            return {} as Database
        });
        const mockRandomBytes = jest.spyOn(crypto, "randomBytes").mockImplementation((size) => {
            return (Buffer.from("salt"))
        })
        const mockScrypt = jest.spyOn(crypto, "scrypt").mockImplementation(async (password, salt, keylen) => {
            return Buffer.from("hashedPassword")
        })
        const result = await userDAO.createUser("username", "name", "surname", "password", "role")
        expect(result).toBe(true)
        mockRandomBytes.mockRestore()
        mockDBRun.mockRestore()
        mockScrypt.mockRestore()
    })

    test("409 KO - Username alrady in database", async () => {
        const userDAO = new UserDAO()
        const mockDBRun = jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback(new Error("UNIQUE constraint failed: users.username"))
            return {} as Database
        });

        await expect(userDAO.createUser("username", "name", "surname", "password", "role")).rejects.toThrowError(UserAlreadyExistsError)
        
    })

    test("Generic DB Error", async () => {
        const userDAO = new UserDAO()
        const mockDBRun = jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback(new Error())
            return {} as Database
        });

        await expect(userDAO.createUser("username", "name", "surname", "password", "role")).rejects.toThrowError(Error)
        
    })



})

describe("getUsers", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    })

    test("200 OK - Users succesfully returned", async () => {
        const users =[new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino","1980-01-01"),new User ("customer2","NameCustomer2","SurnameCustomer2",Role.CUSTOMER,"Torino","1980-01-01")]
        
        jest.spyOn(db, "all").mockImplementation((sql, params, callback) => {
            callback(null, users);
            return {} as Database;
        });

        const result = await userDAO.getUsers()
        expect(result).toStrictEqual(users)
    });

    test("Generic DB Error", async () => {
        const users =[new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino","1980-01-01"),new User ("customer2","NameCustomer2","SurnameCustomer2",Role.CUSTOMER,"Torino","1980-01-01")]
        
        jest.spyOn(db, "all").mockImplementation((sql, params, callback) => {
            callback(new Error());
            return {} as Database;
        });

        await expect(userDAO.getUsers()).rejects.toThrowError(Error)
       
    });


})

describe("getUsersByRole", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    })
    test("200 OK - Users succesfully returned by Role", async () => {
        const users =[new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino","1980-01-01"),new User ("customer2","NameCustomer2","SurnameCustomer2",Role.CUSTOMER,"Torino","1980-01-01")]
        const role = "Customer"
        jest.spyOn(db, "all").mockImplementation((sql, params, callback) => {
            callback(null, users);
            return {} as Database;
        });

        const result = await userDAO.getUsersByRole(role)
        expect(result).toStrictEqual(users)
    });

    test("Generic DB Error", async () => {
        const users =[new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino","1980-01-01"),new User ("customer2","NameCustomer2","SurnameCustomer2",Role.CUSTOMER,"Torino","1980-01-01")]
        const role = "Customer"
        jest.spyOn(db, "all").mockImplementation((sql, params, callback) => {
            callback(new Error);
            return {} as Database;
        });

        await expect(userDAO.getUsersByRole(role)).rejects.toThrowError(Error)
    });
})

describe("getUsersByUsername", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    })

    test("200 OK - Users succesfully returned by Username", async () => {
        const user =new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino","1980-01-01")
        const username = "customer"
        jest.spyOn(db, "get").mockImplementation((sql, params, callback) => {
            callback(null, user);
            return {} as Database;
        });

        const result = await userDAO.getUserByUsername(username)
        expect(result).toStrictEqual(user)
    });

    test("404 KO - User not found", async () => {
        const user =new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino","1980-01-01")
        const username = ""
        jest.spyOn(db, "get").mockImplementation((sql, params, callback) => {
            callback.call({ changes: 0 },null);
            return {} as Database;
        });

        await expect(userDAO.getUserByUsername(username)).rejects.toThrowError(new UserNotFoundError)
    });

    test("Generic DB Error", async () => {
        const user =new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino","1980-01-01")
        const username = "customer"
        jest.spyOn(db, "get").mockImplementation((sql, params, callback) => {
            callback(new Error());
            return {} as Database;
        });

        await expect(userDAO.getUserByUsername(username)).rejects.toThrowError(Error)
    });
})


describe("deleteUser", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    })

    test("200 OK - Users succesfully deleted", async () => {
        const username = "customer"
        jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback.call({ changes: 1 }, null);
            return {} as Database;
        });

        const result = await userDAO.deleteUser(username)
        expect(result).toBe(true)
    });

    test("404 KO - User not found ", async () => {
        const username = "customer"
        jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback.call({ changes: 0 }, null);
            return {} as Database;
        });

        await expect(userDAO.deleteUser(username)).rejects.toThrowError(new UserNotFoundError)
    });

    test("Generic DB Error", async () => {
        const username = "customer"
        jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback(new Error());
            return {} as Database;
        });

        await expect(userDAO.deleteUser(username)).rejects.toThrowError(Error)
    });
})

describe("deleteAll", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    })

    test("200 OK - Users succesfully deleted", async () => {
        jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback.call({ changes: 1 }, null);
            return {} as Database;
        });

        const result = await userDAO.deleteAll()
        expect(result).toBe(true)
    });

    test("Generic DB Error", async () => {
        jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback(new Error());
            return {} as Database;
        });

        await expect(userDAO.deleteAll()).rejects.toThrowError(Error)
    });
})

describe("updateUserInfo", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    })

    test("200 OK - Users succesfully updated", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino, Via Madama Cristina 17","1980-01-01")
        let newUser = new User ("customer","NameCustomer2","SurnameCustome2r",Role.CUSTOMER,"Torino, Via Madama Cristina 17","1980-01-01")
        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockResolvedValueOnce(newUser);
        jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback.call({ changes: 1 }, null);
            return {} as Database;
        });

        const result = await userDAO.updateUserInfo(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate)
        expect(result).toStrictEqual(newUser)
    });

    test("404 KO - User not found", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino, Via Madama Cristina 17","1980-01-01")
        let newUser = new User ("customer","NameCustomer2","SurnameCustome2r",Role.CUSTOMER,"Torino, Via Madama Cristina 17","1980-01-01")
       
        jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback.call({ changes: 0 }, null);
            return {} as Database;
        });

        await expect(userDAO.updateUserInfo(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate)).rejects.toThrowError(new UserNotFoundError)
    });

    test("Generic DB Error", async () => {
        let user = new User ("customer","NameCustomer","SurnameCustomer",Role.CUSTOMER,"Torino, Via Madama Cristina 17","1980-01-01")
        let newUser = new User ("customer","NameCustomer2","SurnameCustome2r",Role.CUSTOMER,"Torino, Via Madama Cristina 17","1980-01-01")
       
        jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback.call(new Error());
            return {} as Database;
        });

        await expect(userDAO.updateUserInfo(user.username,newUser.name,newUser.surname,newUser.address,newUser.birthdate)).rejects.toThrowError(new Error)
    });

})
